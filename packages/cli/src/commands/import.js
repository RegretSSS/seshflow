import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';
import { Storage } from '../core/storage.js';
import crypto from 'crypto';

const DEPENDENCY_PREFIX_RE = /^(dependency|depends|dep|\u4f9d\u8d56)\s*:/i;
const TAG_PREFIX_RE = /^(\u6807\u7b7e|tags?)\s*[:\uff1a]\s*/i;
const PRIORITY_PREFIX_RE = /^(\u4f18\u5148\u7ea7|priority)\s*[:\uff1a]\s*/i;
const ESTIMATE_PREFIX_RE = /^(\u9884\u4f30|estimate)\s*[:\uff1a]\s*/i;

/**
 * Generate task hash for deduplication
 */
function generateTaskHash(title, description) {
  const content = `${title.trim()}\n${(description || '').trim()}`;
  return crypto
    .createHash('sha256')
    .update(content, 'utf8')
    .digest('hex');
}

/**
 * Parse task line from markdown
 * Format: - [ ] Task title [P0] [tag1,tag2] [4h] [@assignee] [dependency:id]
 */
function parseTaskLine(line, lineNumber, isCompleted = false) {
  // Remove checkbox
  const taskLine = line.replace(/^-\s*\[[ x]\]\s*/, '').trim();

  if (!taskLine) return null;

  const task = {
    title: '',
    description: '',
    status: isCompleted ? 'done' : 'backlog',
    priority: 'P2',
    tags: [],
    estimatedHours: 0,
    assignee: null,
    dependencies: [],
  };

  // Extract title (everything before first bracket or end)
  const titleMatch = taskLine.match(/^(.+?)(?:\s+\[|$)/);
  if (titleMatch) {
    task.title = titleMatch[1].trim();
  } else {
    task.title = taskLine.trim();
  }

  // Extract all bracketed content
  const allMatches = taskLine.matchAll(/\[([^\]]+)\]/g);
  for (const match of allMatches) {
    const content = match[1];

    // Check if it's priority (P0-P3)
    if (content.match(/^P[0-3]$/)) {
      task.priority = content;
      task.tags.push(content); // Add priority as a tag
      continue;
    }

    // Skip if it's hours (digits+h)
    if (content.match(/^\d+(\.\d+)?h$/i)) {
      task.estimatedHours = parseFloat(content);
      continue;
    }

    // Skip if it's assignee (@xxx)
    if (content.startsWith('@')) {
      task.assignee = content.substring(1);
      continue;
    }

    // Parse inline dependency metadata
    const dependencies = parseDependencyToken(content);
    if (dependencies.length > 0) {
      task.dependencies.push(...dependencies);
      continue;
    }

    // Everything else is a tag - split by comma and add
    const tags = content.split(',').map(t => t.trim()).filter(Boolean);
    task.tags.push(...tags);
  }

  // Remove duplicate tags
  task.tags = [...new Set(task.tags)];
  task.dependencies = [...new Set(task.dependencies)];

  return task.title ? task : null;
}

function parseDependencyToken(content) {
  if (!DEPENDENCY_PREFIX_RE.test(content)) {
    return [];
  }

  return content
    .replace(DEPENDENCY_PREFIX_RE, '')
    .split(',')
    .map(dep => dep.trim())
    .filter(Boolean);
}

function mapHeadingToStatus(heading = '') {
  const normalized = String(heading).trim().toLowerCase();
  const mappings = [
    { pattern: /^(backlog)$/i, status: 'backlog' },
    { pattern: /^(todo|to do)$/i, status: 'todo' },
    { pattern: /^(in[-\s]?progress)$/i, status: 'in-progress' },
    { pattern: /^(review)$/i, status: 'review' },
    { pattern: /^(done)$/i, status: 'done' },
    { pattern: /^(blocked)$/i, status: 'blocked' },
  ];
  const hit = mappings.find(item => item.pattern.test(normalized));
  return hit ? hit.status : null;
}

function parsePriorityValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  if (/^P[0-3]$/i.test(raw)) {
    return raw.toUpperCase();
  }

  const mappings = {
    urgent: 'P0',
    critical: 'P0',
    high: 'P0',
    medium: 'P1',
    normal: 'P2',
    low: 'P3',
  };

  return mappings[raw] || null;
}

function parseEstimateValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const match = raw.match(/(\d+(?:\.\d+)?)\s*h?/i);
  if (!match) return null;
  return Number.parseFloat(match[1]);
}

function applyMetadataLine(task, content) {
  if (!content) return false;

  const dependencies = parseDependencyToken(content);
  if (dependencies.length > 0) {
    task.dependencies = [...new Set([...(task.dependencies || []), ...dependencies])];
    return true;
  }

  if (TAG_PREFIX_RE.test(content)) {
    const tags = content
      .replace(TAG_PREFIX_RE, '')
      .split(/[,\uff0c]/)
      .map(tag => tag.trim())
      .filter(Boolean);
    task.tags = [...new Set([...(task.tags || []), ...tags])];
    return true;
  }

  if (PRIORITY_PREFIX_RE.test(content)) {
    const value = content.replace(PRIORITY_PREFIX_RE, '').trim();
    const parsed = parsePriorityValue(value);
    if (parsed) {
      task.priority = parsed;
    }
    return true;
  }

  if (ESTIMATE_PREFIX_RE.test(content)) {
    const value = content.replace(ESTIMATE_PREFIX_RE, '').trim();
    const parsed = parseEstimateValue(value);
    if (parsed !== null && !Number.isNaN(parsed)) {
      task.estimatedHours = parsed;
    }
    return true;
  }

  return false;
}

/**
 * Parse markdown file and extract tasks
 */
async function parseMarkdownFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');

  const tasks = [];
  let currentPhase = '';
  let currentStatus = null;
  let currentTask = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('```')) continue;

    // Check for phase/group heading (## or ###)
    if (line.startsWith('##')) {
      currentPhase = line.replace(/^#+\s*/, '').trim();
      currentStatus = mapHeadingToStatus(currentPhase);
      continue;
    }

    // Check if it's a subtask (indented)
    if (rawLine.startsWith('  -') || rawLine.startsWith('\t-')) {
      if (currentTask) {
        const isCompleted = line.match(/\[x\]/i) !== null;
        const subtaskTitle = line.replace(/^[\s\t]*-\s*\[[x ]\]\s*/, '').trim();

        // Extract subtask priority if any
        const priorityMatch = subtaskTitle.match(/\[P[0-3]\]/);
        const priority = priorityMatch ? priorityMatch[0] : '';

        // Clean title
        const title = subtaskTitle.replace(/\[.*?\]/g, '').trim();

        // Extract hours
        const hoursMatch = subtaskTitle.match(/\[(\d+(\.\d+)?)h\]/i);
        const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 0;

        currentTask.subtasks.push({
          title: title,
          completed: isCompleted,
          priority: priority,
          estimatedHours: hours
        });
      }
      continue;
    }

    // Check for description line
    if (line.startsWith('>')) {
      const descLine = line.replace(/^>\s*/, '').trim();
      if (currentTask) {
        currentTask.description = (currentTask.description || '') + descLine + '\n';
      }
      continue;
    }

    // Check for indented metadata/description
    // Example:
    //   濠电姷鏁告慨鐑藉极閸涘﹥鍙忛柣鎴ｆ閺嬩線鏌涘☉姗堟敾闁告瑥绻橀弻锝夊箣閿濆棭妫勯梺鍝勵儎缁舵岸寮婚悢鍏尖拻閻庨潧澹婂Σ顔剧磼閻愵剙鍔ゆい顓犲厴瀵鏁愭径濠勭杸濡炪倖甯婇悞锕傚磿閹惧墎纾藉ù锝呮惈灏忛梺鍛婎殕婵炲﹤顕ｆ繝姘ч柛鈩兠鍧楁⒑瑜版帒浜伴柛蹇旓耿瀹曟垿骞樼拠鎻掑祮闂侀潧绻掓慨鎾吹閹达附鈷戦柛鎾村絻娴滄劙鏌熼崘鍙夊枠鐎规洘鍨块獮姗€鎳￠妶鍛偊闂備礁澹婇悡鍫ュ窗閺嶃劍鍙忛幖绮规閺€浠嬫煟閹伴偊鏉洪柛銈咁儑缁辨帡鎮╅崘鑼紝闂佽鍣ｇ粻鏍箖濠婂牊瀵犲璺哄閹蹭即姊绘笟鈧褔篓閳ь剙鈹戦垾铏枠鐎规洏鍨介弻鍡楊吋閸″繑瀚奸梻浣告惈閸婂爼宕曢幓鎺嗘瀺闁告稑鐡ㄩ悡鏇㈡煟閺冨洦纭剧€规挸妫欓〃銉╂倷鐠囇嗗惈閻庤娲忛崝搴ㄥ焵椤掍胶鈯曟い顓炴喘瀹? 闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤濠€閬嶅焵椤掑倹鍤€閻庢凹鍙冨畷宕囧鐎ｃ劋姹楅梺鍦劋閸ㄥ綊宕愰悙鐑樺仭婵犲﹤瀚惌濠囨婢舵劖鐓涚€广儱楠搁獮妤呮煟閹惧磭绠伴柍瑙勫灴閹瑩妫冨☉妤€顥氭繝鐢靛仜閹冲骸螞濠靛钃熸繛鎴欏灩鍥撮梺鍛婁緱閸欏孩瀵奸崘顔解拺闁告繂瀚～锕傛煕婵犲喚娈橀柛鎺撳笒閳诲酣骞嬮悙鑼紡闂備線娼ч…鍫ュ磹濡や降浠氶柧蹇ｅ亞缁♀偓闂佹眹鍨藉褎绂掑鍫熺厵闁惧浚鍋勬慨鍫ユ煙娓氬灝濮傜€规洖缍婇、鏇㈠Χ閸屾稒鏆ゆ繝鐢靛Х閺佸憡鎱ㄩ弶鎳ㄦ椽濡堕崨顔惧嚱闂傚倸鍊烽懗鍫曗€﹂崼銉ュ珘妞ゆ帒瀚崕妤併亜閺冨倹娅曢柣婵嗙埣閺岋繝宕堕妷銉т痪闂佹娊鏀辩敮鎺楁箒闂佹寧绻傞ˇ钘壩涢幋婵冩闁瑰墽鎳撻惃铏圭磼鏉堛劌娴柣鎿冨亰椤㈡﹢鎮╅悽闈涘箚闂傚倷娴囬鏍窗濡ゅ懏鏅俊鐐€ら崑鍛崲閸曨垰绠查柛鏇ㄥ灡閹偤鎮归崶锝傚亾閾忣偅姣勯梻鍌氬€搁崐椋庣矆娓氣偓楠炲鏁嶉崟顓犵厯闂佺鎻梽鍕磻閵堝鐓忓┑鐐靛亾濞呭懘鏌涘顒傜Ш闁哄本鐩獮鍥Ω閿旂晫褰囩紓鍌欒濡狙囧磻閹剧粯鈷掗柛灞捐壘閳ь剚鎮傞幃褎绻濋崟顓犵厯闂佽鍎抽悺銊モ枍閻樼粯鐓涢柛銉ｅ劚閻忣亪鏌ｉ幘瀵告创闁诡喗顨婇弫鎰償閳ヨ尙鏁栨繝鐢靛仜瀵爼骞愰幎钘夎摕闁挎稑瀚▽顏堟煕閹炬瀚崹鍗炩攽閻樻鏆柛鎾寸箞楠炲啴宕掗悙鍙夌€梺鍛婂姦閸犳牠鎮為崹顐犱簻闁圭儤鍨甸鈺冪磼閳ь剚寰勯幇顓犲帾闂佸壊鍋呯换宥呂ｈぐ鎺撶厽闁规崘娉涢弸娑㈡煛鐏炶濡奸柍瑙勫灴瀹曞崬螣缂佹ê鈧兘姊绘担鍛婂暈闁挎碍銇勯弴銊ュ籍闁糕斁鍋撳銈嗗笒閸犳艾顭囬幇顓犵闁告瑥顦辨晶鐢告煙椤斿搫鍔滅紒铏规櫕缁瑩骞愭惔锝傚亾椤掑嫭鈷戦柛锔诲幖椤ｅ吋绻濋姀鈭额亪顢欒箛鎾斀闁搞儯鍎扮花濠氭⒑閻熺増鎯堟俊顐ｎ殕缁傚秹骞嗚濞撳鏌曢崼婵嗘殭闁告梹绮撻弻銈堛亹閹烘梻鏆梺绯曟櫇閸嬨倝鐛€ｎ喗鏅滈柤鎭掑劜閻濐偊姊绘担鍛婂暈婵炶绠撳畷鎴﹀磼濠婂啫鐏婇柣鐘烘〃鐠€锕€銆掓繝姘厪闁割偅绻冮ˉ婊堟煟韫囧鍔﹂柡宀€鍠栭幖褰掝敃閵忕媭娼氶梻浣虹《閺備線宕戦幘鎰佹富闁靛牆妫楃粭鍌炴煠閸愯尙鍩ｉ柛鈹垮灲楠炴绱掑Ο鐓庡箰闂備礁鎲℃笟妤呭窗濮樿埖鍎楅柟鐑樻煛閸嬫挾鎲撮崟顒傤槰缂佺偓婢樼粔鍫曞箲閵忕姭鏀介悗锝庝簽椤︺劌顪冮妶鍛闁绘锕、鎾愁吋婢跺鎷绘繛杈剧到閹诧繝宕悙鐢电＜閻庯綆鍋勯悘鎾煛娴ｇ鏆ｉ柡浣稿暣瀹曟帒顫濋鈧禍鍫曟⒒娴ｅ湱婀介柛銊ョ秺楠炲鏁撻悩鍐蹭簵闂佺粯鏌ㄩ崥瀣偂閻斿吋鐓涢柛灞剧☉椤曟粓鏌熼崣澶嬪€愰柡宀€鍠栧畷姗€骞撻幒鎾搭啋闂備浇顕栭崰妤呫€冮崨杈剧稏婵犻潧顑嗛崑鍌炲箹缁顫婃繛闂寸矙濮婄粯绗熼埀顒勫焵椤掍胶銆掗柍瑙勫浮閺屾盯寮埀顒勫垂閸噮鍤曟い鎰剁畱缁€鍐┿亜閺冨洤浜归柨娑欑矊閳规垿鎮欓弶鎴犱桓闂佺厧缍婄粻鏍偘椤曗偓瀹曞ジ鎮㈤搹鍦婵犵數鍋涢悧鍡涙倶濠靛鍑犻柣鏂垮悑閻撱儵鏌￠崶銉ュ濞存粎鍋熼埀顒€鐏氬姗€鏁冮鍫濈疇闁绘劕鎼敮閻熸粍绮岀叅?
    //   闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁惧墽鎳撻—鍐偓锝庝簼閹癸綁鏌ｉ鐐搭棞闁靛棙甯掗～婵嬫晲閸涱剙顥氬┑掳鍊楁慨鐑藉磻閻愮儤鍋嬮柣妯荤湽閳ь兛绶氬鏉戭潩鏉堚敩銏ゆ⒒娴ｈ鍋犻柛搴㈡そ瀹曟粓鏁冮崒姘€梺鍛婂姦閸犳鎮￠妷鈺傜厸闁搞儺鐓堝▓鏂棵瑰鍫㈢暫婵﹤鎼晥闁搞儜鈧崑鎾澄旈崨顓狅紱闂佽宕橀崺鏍х暦閸欏绡€闂傚牊绋掑婵堢磼閳锯偓閸嬫捇姊绘担渚劸闁哄牜鍓涢崚鎺戠暆閸旇偐鍏橀崺鈧い鎺戝閳锋帒霉閿濆嫯顒熼柣鎺斿亾閵囧嫰骞嬮悙鑼患闂佺懓绠嶉崹褰掑煘閹寸姭鍋撻敐搴濇捣闁硅姤娲熷娲濞淬儱鐗撳鎻掆槈閵忕姷顢呴梺鎯ф禋閸嬪倻鎹㈤崱娑欑厪闁割偅绻傞埀顒€鎲＄粋宥夋倷椤掑倻顔曢柣搴㈢⊕椤洭鎯岄幒鏃傜＜闁绘ê纾晶鐢碘偓娈垮枦椤曆囧煡婢跺á鐔奉煥閸曨剦妫冮悗瑙勬磸閸旀垿銆佸Δ浣瑰闁告稑锕︽禍楣冩⒒閸屾艾鈧绮堟笟鈧獮鏍敃閿曗偓鐎氬銇勯幒鎴濃偓濠氭儗濞嗘挻鐓欓弶鍫濆⒔閻ｉ亶鏌ｉ幘顖楀亾閹颁胶鍞甸柣鐘烘〃鐠€锕傛偂椤掍胶绠剧紒妤€鎼慨鍌炴煛鐏炲墽娲存い銏℃礋閺佹劙宕堕埡鍐╂濠碉紕鍋戦崐銈夊磻閸℃ɑ鍙忛柛顭戝亞閳瑰秴鈹戦悩鍙夊闁稿﹪鏀遍妵鍕疀閹炬剚浠遍梺绋款儐閹瑰洭鐛崶顒€绾ч悹鎭掑妽閻擄絾绻濋悽闈涒枅婵炰匠鍥舵晞闁告侗鍨抽惌鍡涙煕鐏炲墽鈯曢柛娆忕箲娣囧﹪鎮欐０婵嗘婵炲瓨绮嶉崕瀹犵亙闂佺粯锕㈠褎绂掑鍫熺厱闁绘梻顭堥埢鏇炩攽閿涘嫭鏆鐐叉喘瀵墎鎹勯…鎴濇暯闂傚倷鑳堕幊鎾活敋椤撶喐鍙忛柟缁㈠枛閻掑灚銇勯幒鎴濃偓鍛婄鏉堛劍鍙忓┑鐘插暞閵囨繃淇婇銏犳殭闁宠棄顦板蹇涘煛娴ｆ劅顏堟⒒閸屾瑨鍏屾い顓炵墛椤ㄣ儵宕妷銉濡炪倖鎸炬慨鎾垂濠靛棌鏀介柣妯诲絻閳ь剙顭峰宕団偓锝庡枟閳锋垶銇勯幘鍗炲婵＄虎鍣ｉ幃妤呮濞戞氨鍔┑顔硷攻濡炶棄螞閸愩劉妲堟慨姗嗗墻閺嗩偄鈹戞幊閸婃鎱ㄩ幘顔肩疅闁挎稑瀚惌澶屸偓骞垮劚椤︻垶宕橀埀顒€顪冮妶鍡樺暗闁哥姵鎹囧畷銏℃綇閵娧呯槇闂佹眹鍨藉褍鐡梻浣告憸閸犳劖绔熼崱娆忓灊濠电姵纰嶉崐椋庣棯閻楀煫顏呯閻愵剛绠鹃柛顐ｇ箘娴犮垽鏌＄€ｎ偆鈯曢柕鍥у椤㈡﹢鎮╅幓鎺戠婵°倗濮烽崑娑㈠疮鐎涙ɑ鍙忛柍褜鍓熼弻鏇㈠醇濠靛浂妫為梺閫炲苯澧扮紒顕呭灡缁岃鲸绻濋崶鑸垫櫖濠电娀娼уù鍌涚閳哄懏鍋℃繝濠傛噹椤ｅジ鏌熺粙鍨毐妞ゎ偄绻掔槐鎺懳熺拠宸偓鎾绘⒑閼恒儍顏埶囬澶寡兾旈崨顔规嫼闂佸憡鍔栬ぐ鍐ㄎｆ繝姘厽婵°倓鐒︾亸顓㈡煟閿濆懎妲绘い顓滃姂瀹曟﹢鏁愰崱鈺傜秾闂傚倷绶氬褏鎹㈤崱娑樼柧婵犲﹤鐗嗛悿楣冩煃閸濆嫭鍣洪柍閿嬪灩閻ヮ亪顢橀悙鏉戞閻熸粍濡搁崶銊㈡嫽闂佸憡娲﹂崑鍕敂椤撱垺鐓?
    const isIndented = /^\s+/.test(rawLine);
    if (isIndented && currentTask) {
      const normalized = line.replace(/^[-*]\s*/, '');
      const isMetadata = applyMetadataLine(currentTask, normalized);
      if (!isMetadata) {
        currentTask.description = (currentTask.description || '') + normalized + '\n';
      }
      continue;
    }

    // Check for task line
    if (line.match(/^-\s*\[[ x]\]/)) {
      const isCompleted = line.match(/^-\s*\[x\]/i) !== null;
      const task = parseTaskLine(line, i + 1, isCompleted);

      if (task) {
        // Initialize subtasks array
        task.subtasks = [];

        if (!isCompleted && currentStatus) {
          task.status = currentStatus;
        }

        // Add non-status section heading as a tag
        if (currentPhase && !currentStatus && !task.tags.includes(currentPhase)) {
          task.tags.push(currentPhase);
        }

        tasks.push(task);
        currentTask = task; // Set as current task for descriptions
      }
    }
  }

  // Trim description whitespace
  tasks.forEach(task => {
    if (task.description) {
      task.description = task.description.trim();
    }
  });

  return tasks;
}

/**
 * Validate tasks before import
 */
function validateTasks(tasks) {
  const errors = [];
  const warnings = [];

  tasks.forEach((task, index) => {
    const taskNum = index + 1;

    // Check required fields
    if (!task.title) {
      errors.push(`Task ${taskNum}: title is required`);
    }

    // Check priority
    if (!['P0', 'P1', 'P2', 'P3'].includes(task.priority)) {
      warnings.push(`Task ${taskNum}: invalid priority ${task.priority}`);
    }

    // Check hours
    if (task.estimatedHours < 0) {
      errors.push(`Task ${taskNum}: estimated hours cannot be negative`);
    }

    // Warn if large task has no description
    if (!task.description && task.estimatedHours > 4) {
      warnings.push(`Task ${taskNum}: large task (${task.estimatedHours}h) has no description`);
    }
  });

  return { errors, warnings };
}

/**
 * Resolve dependencies from numbers/indices to task IDs
 */
function resolveDependencies(createdTasks, knownTasks = []) {
  const resolveDependencyRef = (dep) => {
    const value = String(dep).trim();
    if (!value) return null;

    const numericIndex = Number.parseInt(value, 10);
    if (Number.isInteger(numericIndex) && numericIndex > 0) {
      const indexedTask = createdTasks[numericIndex - 1];
      if (indexedTask) return indexedTask.id;
    }

    if (knownTasks.some(task => task.id === value)) {
      return value;
    }

    const byTitle = createdTasks.find(task => task.title === value)
      || knownTasks.find(task => task.title === value);
    if (byTitle) return byTitle.id;

    return value;
  };

  createdTasks.forEach((task) => {
    if (task.dependencies && task.dependencies.length > 0) {
      const resolvedDeps = task.dependencies
        .map(resolveDependencyRef)
        .filter(Boolean);

      task.dependencies = [...new Set(resolvedDeps)];
      task.blockedBy = task.dependencies;
    }
  });
}

/**
 * Import tasks from markdown file
 */
export async function importTasks(filePath, options = {}) {
  const spinner = process.stdout.isTTY ? ora('Loading and parsing tasks').start() : null;

  try {
    // Check if file exists
    if (!(await fs.pathExists(filePath))) {
      spinner?.fail('File not found');
      console.error(chalk.red(`\nError: File not found: ${filePath}`));
      process.exit(1);
    }

    // Parse markdown file
    if (spinner) spinner.text = 'Parsing markdown file';
    const tasks = await parseMarkdownFile(filePath);

    if (tasks.length === 0) {
      spinner?.warn('No tasks found');
      console.log(chalk.yellow('\nNo tasks found in the file.'));
      console.log(chalk.gray('Make sure your tasks follow the format:'));
      console.log(chalk.gray('  - [ ] Task title [P0] [tag1,tag2] [4h]'));
      return;
    }

    // Validate tasks
    if (spinner) spinner.text = 'Validating tasks';
    const { errors, warnings } = validateTasks(tasks);

    if (errors.length > 0) {
      spinner?.fail('Validation failed');
      console.error(chalk.red('\nValidation errors:'));
      errors.forEach((error) => console.error(chalk.red(`  - ${error}`)));
      process.exit(1);
    }

    // Show warnings if any
    if (warnings.length > 0 && !options.force) {
      spinner?.warn('Validation warnings');
      console.log(chalk.yellow('\nWarnings:'));
      warnings.forEach((warning) => console.log(chalk.yellow(`  - ${warning}`)));

      if (!options.dryRun) {
        console.log(chalk.gray('\nUse --force to ignore warnings'));
      }
    }

    // Dry run mode
    if (options.dryRun) {
      spinner?.succeed('Dry run completed');
      console.log(chalk.green(`\nWould import ${tasks.length} tasks:\n`));

      tasks.forEach((task, index) => {
        const descPreview = task.description ?
          task.description.substring(0, 50) + (task.description.length > 50 ? '...' : '') :
          '(no description)';

        console.log(chalk.gray(`${index + 1}. ${task.title}`));
        console.log(chalk.dim(`   Priority: ${task.priority}`));
        console.log(chalk.dim(`   Tags: ${task.tags.join(', ') || 'none'}`));
        console.log(chalk.dim(`   Description: ${descPreview}`));
        if (task.estimatedHours > 0) {
          console.log(chalk.dim(`   Hours: ${task.estimatedHours}h`));
        }
        console.log('');
      });

      return;
    }

    // Import tasks
    if (spinner) spinner.text = 'Importing tasks';
    const manager = new TaskManager();
    await manager.init();

    // Deduplication
    const existingTasks = manager.getTasks();
    const existingHashes = new Map();

    existingTasks.forEach(task => {
      const hash = generateTaskHash(task.title, task.description);
      existingHashes.set(hash, task);
    });

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      duplicates: []
    };

    const createdTasks = [];

    for (const taskData of tasks) {
      const hash = generateTaskHash(taskData.title, taskData.description);
      const existing = existingHashes.get(hash);

      if (!existing) {
        // New task - create
        const created = await manager.createTask({
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
          dependencies: taskData.dependencies,
        });

        // Add subtasks if any
        if (taskData.subtasks && taskData.subtasks.length > 0) {
          created.subtasks = taskData.subtasks;
        }

        createdTasks.push(created);
        results.created++;
      }
      else if (options.update) {
        // Task exists - update
        await manager.updateTask(existing.id, {
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
        });
        results.updated++;
      }
      else if (options.force) {
        // Force create - don't check duplicates
        const created = await manager.createTask({
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
          dependencies: taskData.dependencies,
        });

        if (taskData.subtasks && taskData.subtasks.length > 0) {
          created.subtasks = taskData.subtasks;
        }

        createdTasks.push(created);
        results.created++;
      }
      else {
        // Skip duplicate
        results.skipped++;
        results.duplicates.push({
          existing: existing,
          new: taskData
        });
      }
    }

    // Save all tasks
    await manager.saveData();

    // Resolve dependencies (convert numeric indices to task IDs)
    resolveDependencies(createdTasks, [...existingTasks, ...createdTasks]);

    // Update tasks with resolved dependencies and subtasks
    for (const task of createdTasks) {
      await manager.updateTask(task.id, {
        dependencies: task.dependencies,
        blockedBy: task.blockedBy,
        subtasks: task.subtasks
      });
    }

    // Final save
    await manager.saveData();

    spinner?.succeed('Tasks imported successfully');

    const countByPriority = { P0: 0, P1: 0, P2: 0, P3: 0 };
    let dependencyCount = 0;
    let subtaskCount = 0;
    createdTasks.forEach(task => {
      if (countByPriority[task.priority] !== undefined) {
        countByPriority[task.priority] += 1;
      }
      dependencyCount += (task.dependencies || []).length;
      subtaskCount += (task.subtasks || []).length;
    });

    console.log(chalk.green(`\nImported ${results.created} task(s).`));
    console.log(
      chalk.gray(
        `  Processed: ${tasks.length} | Created: ${results.created} | Skipped: ${results.skipped}${results.updated > 0 ? ` | Updated: ${results.updated}` : ''}`
      )
    );
    console.log(
      chalk.gray(
        `  P0: ${countByPriority.P0} | P1: ${countByPriority.P1} | P2: ${countByPriority.P2} | P3: ${countByPriority.P3}`
      )
    );
    console.log(chalk.gray(`  Dependencies: ${dependencyCount} | Subtasks: ${subtaskCount}`));

    if (options.verbose && results.created > 0) {
      console.log(chalk.blue('\nVerbose imported task list:'));
      createdTasks.forEach((task, index) => {
        const priorityColor = {
          P0: 'red',
          P1: 'yellow',
          P2: 'blue',
          P3: 'green',
        }[task.priority] || 'gray';

        console.log(chalk.gray(`${index + 1}. ${task.title}`));
        console.log(chalk.dim(`   ID: ${task.id}`));
        console.log(chalk[priorityColor](`   Priority: ${task.priority}`));

        if (task.tags && task.tags.length > 0) {
          console.log(chalk.dim(`   Tags: ${task.tags.join(', ')}`));
        }

        if (task.description) {
          const descPreview = task.description.substring(0, 60);
          console.log(chalk.dim(`   Description: ${descPreview}${task.description.length > 60 ? '...' : ''}`));
        }

        if (task.estimatedHours > 0) {
          console.log(chalk.dim(`   Hours: ${task.estimatedHours}h`));
        }

        if (task.dependencies && task.dependencies.length > 0) {
          console.log(chalk.dim(`   Depends on: ${task.dependencies.join(', ')}`));
        }

        if (task.subtasks && task.subtasks.length > 0) {
          console.log(chalk.dim(`   Subtasks: ${task.subtasks.length}`));
        }

        console.log('');
      });
    }

    if (results.skipped > 0 && !options.force) {
      console.log(chalk.blue('\nTip: Use --update to update existing tasks'));
      console.log(chalk.gray('         Use --force to force create duplicates\n'));
    }

    console.log(chalk.blue('Next steps:'));
    console.log(chalk.gray('  seshflow next     - Start working on first task'));
    console.log(chalk.gray('  seshflow query    - Query tasks by filters'));
    console.log(chalk.gray('  seshflow stats    - Show statistics'));
  } catch (error) {
    spinner?.fail('Import failed');
    console.error(chalk.red(`\nError: ${error.message}`));

    if (error.message.includes('unexpected token')) {
      console.error(chalk.yellow('\nTip: Make sure your markdown file is properly formatted'));
      console.error(chalk.gray('Example:'));
      console.error(chalk.gray('  - [ ] Task title [P0] [tag1,tag2] [4h]'));
    }

    process.exit(1);
  }
}
