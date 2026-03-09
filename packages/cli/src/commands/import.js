import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import { TaskManager } from '../core/task-manager.js';
import crypto from 'crypto';
import { isValidContractId, isValidTaskId } from '../utils/helpers.js';
import { CONTRACT_ROLES } from '../../../shared/constants/contracts.js';

const DEPENDENCY_PREFIX_RE = /^(dependency|depends|dep|\u4f9d\u8d56)\s*:/i;
const CONTRACT_PREFIX_RE = /^contracts?\s*:/i;
const CONTRACT_HEADING_PREFIX_RE = /^contract\s*:/i;
const CONTRACT_ROLE_PREFIX_RE = /^contract-role\s*:/i;
const FILE_PREFIX_RE = /^(files?|bound-files?)\s*:/i;
const ID_PREFIX_RE = /^id\s*:/i;
const TAG_PREFIX_RE = /^(\u6807\u7b7e|tags?)\s*[:\uff1a]\s*/i;
const PRIORITY_PREFIX_RE = /^(\u4f18\u5148\u7ea7|priority)\s*[:\uff1a]\s*/i;
const ESTIMATE_PREFIX_RE = /^(\u9884\u4f30|estimate)\s*[:\uff1a]\s*/i;
const COLUMN_PREFIX_RE = /^(column|status|\u5217|\u72b6\u6001)\s*[:\uff1a]\s*/i;

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
    id: null,
    lineNumber,
    title: '',
    description: '',
    status: isCompleted ? 'done' : 'backlog',
    priority: 'P2',
    tags: [],
    estimatedHours: 0,
    assignee: null,
    dependencies: [],
    contractIds: [],
    contractRole: null,
    boundFiles: [],
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

    if (COLUMN_PREFIX_RE.test(content)) {
      const inlineStatus = parseStatusValue(content.replace(COLUMN_PREFIX_RE, ''));
      if (inlineStatus) {
        task.status = inlineStatus;
        continue;
      }
    }

    const stableId = parseIdToken(content);
    if (stableId) {
      task.id = stableId;
      continue;
    }

    // Parse inline dependency metadata
    const dependencies = parseDependencyToken(content);
    if (dependencies.length > 0) {
      task.dependencies.push(...dependencies);
      continue;
    }

    const contractIds = parseContractToken(content);
    if (contractIds.length > 0) {
      task.contractIds.push(...contractIds);
      continue;
    }

    const contractRole = parseContractRoleToken(content);
    if (contractRole) {
      task.contractRole = contractRole;
      continue;
    }

    const boundFiles = parseFileToken(content);
    if (boundFiles.length > 0) {
      task.boundFiles.push(...boundFiles);
      continue;
    }

    // Everything else is a tag - split by comma and add
    const tags = content.split(',').map(t => t.trim()).filter(Boolean);
    task.tags.push(...tags);
  }

  // Remove duplicate tags
  task.tags = [...new Set(task.tags)];
  task.dependencies = [...new Set(task.dependencies)];
  task.contractIds = [...new Set(task.contractIds)];
  task.boundFiles = [...new Set(task.boundFiles)];

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

function parseIdToken(content) {
  if (!ID_PREFIX_RE.test(content)) {
    return null;
  }

  const value = content.replace(ID_PREFIX_RE, '').trim();
  return value || null;
}

function parseContractToken(content) {
  if (!CONTRACT_PREFIX_RE.test(content)) {
    return [];
  }

  return content
    .replace(CONTRACT_PREFIX_RE, '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function parseContractRoleToken(content) {
  if (!CONTRACT_ROLE_PREFIX_RE.test(content)) {
    return null;
  }

  const value = content.replace(CONTRACT_ROLE_PREFIX_RE, '').trim().toLowerCase();
  return Object.values(CONTRACT_ROLES).includes(value) ? value : value || null;
}

function parseFileToken(content) {
  if (!FILE_PREFIX_RE.test(content)) {
    return [];
  }

  return content
    .replace(FILE_PREFIX_RE, '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function mapHeadingToStatus(heading = '') {
  const normalized = String(heading).trim().toLowerCase();
  if (CONTRACT_HEADING_PREFIX_RE.test(normalized)) {
    return null;
  }
  const explicit = normalized.match(/\[(backlog|todo|in-progress|review|done|blocked)\]/i);
  if (explicit) {
    return explicit[1].toLowerCase();
  }
  return parseStatusValue(normalized);
}

function parseStatusValue(value = '') {
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes('in progress') || raw.includes('in-progress') || raw.includes('\u8fdb\u884c\u4e2d')) {
    return 'in-progress';
  }
  if (raw.includes('todo') || raw.includes('to do') || raw.includes('\u5f85\u529e') || raw.includes('\u5f85\u505a')) {
    return 'todo';
  }
  if (raw.includes('backlog') || raw.includes('\u5f85\u529e\u6c60')) {
    return 'backlog';
  }
  if (raw.includes('review') || raw.includes('\u5ba1\u67e5') || raw.includes('\u8bc4\u5ba1')) {
    return 'review';
  }
  if (raw.includes('blocked') || raw.includes('\u963b\u585e') || raw.includes('\u53d7\u963b')) {
    return 'blocked';
  }
  if (raw.includes('done') || raw.includes('\u5df2\u5b8c\u6210') || raw.includes('\u5b8c\u6210')) {
    return 'done';
  }

  return null;
}
function parsePriorityValue(value) {
  const raw = String(value || '').trim().toLowerCase();
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

  const stableId = parseIdToken(content);
  if (stableId) {
    task.id = stableId;
    return true;
  }

  const dependencies = parseDependencyToken(content);
  if (dependencies.length > 0) {
    task.dependencies = [...new Set([...(task.dependencies || []), ...dependencies])];
    return true;
  }

  const contractIds = parseContractToken(content);
  if (contractIds.length > 0) {
    task.contractIds = [...new Set([...(task.contractIds || []), ...contractIds])];
    return true;
  }

  const contractRole = parseContractRoleToken(content);
  if (contractRole) {
    task.contractRole = contractRole;
    return true;
  }

  const boundFiles = parseFileToken(content);
  if (boundFiles.length > 0) {
    task.boundFiles = [...new Set([...(task.boundFiles || []), ...boundFiles])];
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

  if (COLUMN_PREFIX_RE.test(content)) {
    const value = content.replace(COLUMN_PREFIX_RE, '').trim();
    const parsed = parseStatusValue(value);
    if (parsed) {
      task.status = parsed;
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
  let currentStatus = null;
  let currentContractIds = [];
  let currentTask = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('```')) continue;

    // Check for phase/group heading (## or ###)
    if (line.startsWith('##')) {
      const heading = line.replace(/^#+\s*/, '').trim();
      if (CONTRACT_HEADING_PREFIX_RE.test(heading)) {
        currentContractIds = heading
          .replace(CONTRACT_HEADING_PREFIX_RE, '')
          .split(',')
          .map(value => value.trim())
          .filter(Boolean);
        continue;
      }
      currentStatus = mapHeadingToStatus(heading);
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
    //   濠电姷鏁告慨鐑藉极閸涘﹥鍙忛柣鎴ｆ閺嬩線鏌涘☉姗堟敾闁告瑥绻橀弻锝夊箣閿濆棭妫勯梺鍝勵儎缁舵岸寮诲☉妯锋婵鐗婇弫楣冩⒑閸涘﹦鎳冪紒缁橈耿瀵鏁愭径濠勵吅闂佹寧绻傚Λ顓炍涢崟顖涒拺闁告繂瀚烽崕搴ｇ磼閼搁潧鍝虹€殿喖顭烽幃銏ゅ礂鐏忔牗瀚介梺璇查叄濞佳勭珶婵犲伣锝夘敊閸撗咃紲闂佺粯鍔﹂崜娆撳礉閵堝棎浜滄い鎾跺Т閸樺鈧鍠栭…鐑藉极閹邦厼绶炲┑鐘插閺夊憡淇婇悙顏勨偓鏍暜婵犲洦鍊块柨鏇炲€哥壕鍧楁煙閹冾暢缁炬崘妫勯湁闁挎繂鎳忛幆鍫焊韫囨稒鈷戦柛娑橆煬濞堟洖鈹戦悙璇у伐妞ゆ洩绲剧换婵嗩潩椤戔敪鍥ㄧ厱闁斥晛鍘鹃鍕靛殨闁秆勵殕閳锋垹鎲搁悧鍫濈瑨濞存粈鍗抽弻娑滅疀閺冩捁鈧法鈧娲橀崹鍧楃嵁濡吋瀚氶柟缁樺笒缁侇噣姊绘笟鈧褏鎹㈤幒鎾村弿闁圭虎鍠栭崥褰掓煙鏉堥箖妾柍閿嬪灴閺屾盯骞橀弶鎴犵シ婵炲瓨绮嶉崝娆撳蓟閻旂厧绀冮柛娆忣槸閺嬬娀鎮楃憴鍕闁搞劌娼￠悰顔碱潨閳ь剟骞婇敓鐘参ч柛娑卞灛閸嬪﹪姊婚崒娆戭槮濠㈢懓锕幃锟犲醇閵夈儳鐛ラ梺鍝勭Р閸斿秹宕ｈ箛娑樼缂侇喛顫夐鍡涙煛閳ь剚绂掔€ｎ偆鍘介梺閫涘嵆閸嬪﹪寮跺ú顏呯厱闁靛牆鎷嬮崕鎴犵磼鏉堛劌娴柟顔规櫊瀹曟﹢鎳犻璺ㄧ闂傚倷娴囬鏍闯閿濆洨涓嶉柡宥庡幖缁犳牗绻濇繝鍌滃閻庣數濮撮…璺ㄦ崉閸濆嫷鍔夐梺纭呭紦閸楀啿顫忕紒妯肩懝闁逞屽墮椤洩顦圭弧鎾绘煃瑜滈崜娆撳煘閹达箑鐏抽柧蹇ｅ亜閺嬬娀鎮楃憴鍕８闁搞劋绮欏濠氬幢濡ゅ﹤鎮戦梺绯曗偓宕囩閻庢艾銈稿缁樻媴閸涘﹥鍎撻梺绋匡工閻栫厧鐣烽弴銏犵闁瑰搫妫欓悗娲⒑閸涘﹦鈽夐柣掳鍔戦幃锟犲即閵忥紕鍘介梺鍝勫暙濞诧妇娑甸崜褉鍋撶憴鍕碍婵☆偅鐟╅妴鍐Ψ閳哄倸鈧兘鎮归崶鍥ф閹牓鏌ｆ惔銈庢綈婵炴彃绻樺畷婵囨償閵娿儳鍔﹀銈嗗笂閼冲爼鍩婇弴鐔翠簻妞ゆ挾鍋為崰妯尖偓? 闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤缂嶅﹪寮婚悢鍏尖拻閻庨潧澹婂Σ顔剧磼閻愵剙鍔ょ紓宥咃躬瀵鎮㈤崗灏栨嫽闁诲酣娼ф竟濠偽ｉ鍓х＜闁绘劦鍓欓崝銈嗙節閳ь剟鏌嗗鍛姦濡炪倖甯掗崐褰掑吹閳ь剟鏌ｆ惔銏犲毈闁告瑥鍟悾宄扮暦閸パ屾闁诲函绲婚崝瀣уΔ鍛拺闁革富鍘奸崝瀣煕閵娿儳绉虹€规洘鍔欓幃娆撴倻濡桨鐢绘繝鐢靛Т閿曘倗鈧凹鍣ｉ幆灞剧節閸ヮ煈姊挎繝銏ｅ煐閸旀牠鎮″☉姘ｅ亾楠炲灝鍔氬Δ鐘虫倐閻涱喖螖閸涱喚鍘介梺瑙勫劤绾绢厾绮绘导瀛樼厓閻熸瑥瀚悘鎾煙椤旂晫鎳囨俊顐㈠暙閳藉螖閳ь剟藟濮橆厾绡€闁汇垽娼ф禒婊堟煙閸愭煡顎楅摶鐐寸節闂堟侗鍎忛柦鍐枑缁绘盯骞嬪▎蹇曚患闁搞儲鎸冲娲川婵犱胶绻侀梺鍛婄懃鐎涒晝鈧潧銈稿畷姗€顢欑憴锝嗗闂備礁鎲＄换鍌溾偓姘煎灦閿濈偤鏁冮崒娑氬幈婵犵數濮撮崰姘枔濮椻偓閺屾盯骞掗幘宕囩懆闂佸疇顕ч柊锝夌嵁鐎ｎ喗鍊烽柤纰卞墾缁憋繝姊婚崒娆戠獢婵炰匠鍥ｂ偓锕傚醇閵夈儳锛欏┑掳鍊撻梽宥嗙濮樿埖鐓ｉ煫鍥风到娴滅偟绱掗埦鈧崑鎾绘⒒娴ｅ湱婀介柛銊ㄦ椤洩顦崇紒鍌涘笒椤劑宕奸悢鍝勫箥闂備焦鍎冲ù姘跺磻閸曨剚鍙忛柛顐犲劜閻撴瑥銆掑顒備虎濠殿喖鍊婚埀顒冾潐濞叉牜绱炴繝鍥モ偓渚€寮撮姀鐘栄囨煕鐏炲墽鈯曢柡鍡愬€栫换婵嬫偨闂堟刀銉╂煛娴ｅ憡鍟為柟渚垮姂瀵爼骞婇妸锔姐仢濠碘€崇埣瀹曘劑顢欓幆褍姣愰梻鍌氬€搁崐鎼佸磹閻戣姤鍤勯柛顐ｆ磵閳ь剨绠撳畷濂稿Ψ閵夈儳褰夋俊鐐€栫敮鎺斺偓姘煎弮瀹曟洖螖娴ｅ吀绨婚梺鍝勫暙閸婄懓鈻嶉弴銏＄厽婵犻潧妫涢崺锝夋煛瀹€瀣瘈鐎规洖鐖兼俊鐑藉Ψ瑜岄惀顏堟⒒娴ｇ懓鈻曢柡鈧潏鈺傛殰闁圭儤顨嗙粻鎺楁⒒娴ｇ懓顕滅紒璇插€胯棟闁芥ê锛夊☉銏犵婵犻潧鍟～宥夋⒑閻熸澘鈷旈柟铏崌閹啴鎼归崷顓狅紲闁哄鐗勯崝灞矫归鈧弻锝夊箼閸愩劋鍠婂銈冨灪閿曘垽骞冮埡鍛仺闂傚牊绋戠粻姘舵⒒閸屾艾鈧嘲霉閸ヮ剦鏁嬮柡宥庡幖缁愭淇婇妶鍛櫤闁哄拋浜濇穱濠囨倷椤忓嫧鍋撻妶澶婄；闁告侗鍨卞畷鏌ユ煕閺囥劌鐏犵紒鐘崇叀閺屾盯寮撮妸銉т画闂佽鍨抽崑銈夊箖瑜版帒鐐婇柨婵嗗€告禍楣冩煣韫囷絽浜濇慨锝呭濮婂宕掑顑藉亾閹间礁纾瑰瀣捣閻棗銆掑锝呬壕濡ょ姷鍋涢ˇ鐢稿极瀹ュ绀嬫い鎾跺Х閸橆垶姊绘担渚敯闁规椿浜浠嬪礋椤栨氨锛涢梺闈涚墕椤︿即鎮¤箛鎾斀闁绘劙娼ф禍鐐箾閸涱厽鍤囬柡灞剧☉椤繈顢楅崒婧炪劑姊洪崫鍕拱闁烩晩鍨堕悰顕€宕堕鈧儫闂佹寧姊婚弲顐ャ亹閸モ晝纾介柛灞剧懆椤斿淇婇悪娆忔搐绾惧鏌熼崜褏甯涢柍閿嬪浮閺屾稓浠﹂幑鎰棟闂侀€炲苯澧柟顔煎€块獮鍐槼缂佺粯绻堝畷鐔碱敇閻橀潧骞嗛梻鍌欐祰椤宕曢幎鑺ュ仱闁靛鍎弸宥夋煟濡偐甯涢柣鎾寸洴閺屾盯濡烽敐鍛闂佽娴氭禍顏堝蓟閿濆绠婚悗闈涙啞閸掓盯姊虹拠鈥虫灍妞ゃ劌锕顐﹀箛椤撶喎鍔呴梺鐐藉劥鐏忔瑩寮弽銊х瘈闁汇垽娼ф禒婊呪偓娈垮枛閻栧ジ鐛幇鏉跨闁芥ê顦抽幗鏇㈡⒑閹稿海鈽夐悗姘间簻閳讳粙顢旈崼鐔哄幈闂佸湱鍋撻〃鍛偓姘煎墴瀹曞綊宕￠悙鈺傛杸闂佺粯蓱椤旀牠寮抽鐐寸厱闁规儳顕粻鐐搭殽閻愭彃鏆ｇ€规洘甯￠幃娆撳矗婢跺备鍋撻鍕拺闁告稑锕ゆ慨锕傛煕閻樺磭澧甸柟顔惧仱瀹曞綊顢曢悩杈╃泿闂備礁婀遍崕銈夊垂閻㈠壊鏁傞柍鍝勫暟绾惧ジ鏌嶈閸撴艾顕ラ崟顖氱疀妞ゆ挾濮寸敮楣冩⒒娴ｇ顥忛柛瀣噽閹广垹顓奸崨鍌︾秬閵囨劙骞掗幘璺哄箺闂備浇顫夊畷妯衡枖濞戙垹鍑犳繛鎴欏灪閻撴盯鎮橀悙棰濆殭濠碘€炽偢閺屽秶鎲撮崟顐や紝閻庤娲栧畷顒冪亽缂傚倷鐒﹂敋闁逞屽墰閸忔ê顫忕紒妯诲闁告稑锕ら弳鍫ユ⒑閹稿海顣查柕鍥у瀵挳濡搁妷銉х潉闂備胶纭堕弬渚€宕戦幘鎰佹富闁靛牆妫楃粭鎺楁煕閻樺疇澹樻い顓炴喘楠炲洭顢橀悩娈垮晭闂備礁鎲￠悷銉┧囨潏銊︽珷闁汇垹鎲￠悡娆愩亜閺傛寧鎯堥柛鏃€绮庣槐鎺楁惞鐟欏嫭鐝紓渚囧枟閻熲晠鐛幇顓熷劅闁挎繂鍊告禍鐐亜閹烘垵顏柍閿嬪灴閺屾盯鏁傜拠鎻掔濡炪倧绲介崥瀣崲濠靛顫呴柍顓㈩杺娴滎亪銆佸▎鎺旂杸闁圭虎鍨遍弬鈧梻浣规偠閸庮垶宕曢幍顔垮С濠电姵纰嶉埛鎴︽煟閻斿搫顣奸柟顖氱墛娣囧﹪顢曢敐搴㈢暦缂備礁鍊哥粔褰掔嵁閸℃凹妾ㄥ┑鐐存尭椤兘寮婚弴銏犻唶婵犻潧妫欏▓顓㈡⒑閸涘﹥鈷愮紒顔芥崌瀵濡堕崼娑楁睏闂佸湱鍎ゅ濠氬汲椤愶附鈷戠紒顖涙礃濞呭洭鏌涚€ｃ劌鈧繈鎮伴閿亾閿濆骸鏋熼柡鍛矒閺屻倝骞侀幒鎴濆闂佺粯绻嶉崑濠傤潖缂佹ɑ濯撮柛娑橈工閺嗗牆鈹戦悙棰濆殝缂佺姵鎸搁悾鐑藉箣閿曗偓绾惧吋绻濇繝鍌氭殭闁诲繐锕弻锝夋偐閻戞ǜ鈧啴鎮归埀顒勬晝閳ь剟濡撮幒鎾剁瘈婵﹩鍘鹃崢顏堟⒑閸撴彃浜濈紒璇插暣钘熸繝濠傜墛閻撶喖鐓崶褜鍎忛柛鏃撶畵閺屸€崇暆閳ь剟宕伴弽顓炵鐟滅増甯╅弫鍐煏韫囨洖顎屾繛鍏煎哺濮婄粯鎷呴搹骞库偓濠囨煛閸屾瑧绐旂€规洘鍨块獮姗€骞囨担鐟扮槣闂備線娼ч悧鍡椢涘Δ鍐當闁稿瞼鍋為悡鐘绘煕閹邦垰鐨洪柛鈺嬬秮閺屾盯鍩為崹顔句紙濡ょ姷鍋為…鍥╂閹烘嚦鐔兼偂鎼达紕顔囬梻鍌氬€风粈渚€骞夐埄鍐懝婵°倕鎳庣粣妤佹叏濡灝鐓愰柛搴㈩殜閺岀喖鎮滃Ο鑽ゅ幐闂佺顑嗛幐楣冨箟閹绢喖绀嬫い鎺戝亞濡叉壆绱撴担鍝勪壕婵犮垺顭囩划鏃堝醇閺囩偟顔夐梺闈涚箳婵參寮ㄦ禒瀣€甸柨婵嗙凹缁ㄨ姤銇勯敂鍝勫妞ゎ亜鍟存俊鍫曞川椤栨粠鍞堕梻浣虹帛椤ㄥ懘鏁冮鍫涒偓渚€骞橀幇浣告倯婵犮垼娉涢鍌炲箯缂佹绠鹃弶鍫濆⒔閸掍即鏌熺拠褏绡€鐎规洦鍨堕幃娆撴偨閻㈢绱查梺璇插嚱缂嶅棝宕戦崟顖涘€堕柟缁㈠枟閻撴稑霉閿濆浂鐒鹃柡鍡秮閺屸剝鎷呯粙鎸庢閻庤娲樼敮鎺楋綖濠靛鏁嗛柍褜鍓氱粋宥夊醇閺囩啿鎷绘繛杈剧到濠€鍗烇耿娴犲鐓曢柕濞垮劤缁夌儤顨ラ悙宸█闁轰焦鎹囬幃鈺呭礃闊厾鏆楅梻鍌欒兌缁垶寮婚妸鈺佽Е閻庯綆鍠楅崑鍌炴煟閺傚灝鎮戦柣鎾寸洴閺屾稓浠﹂崜褉妲堝銈嗘礃缁捇寮婚悢鐓庣煑濠㈣泛顑呴埀顒佸姍閺屸€崇暆閳ь剟宕伴弽褏鏆︽慨妞诲亾妤犵偞鎹囬獮鎺楀箻閹碱厼鏅梻鍌氬€峰ù鍥敋閺嶎厼绐楁俊銈呮噷閳ь剙鍟村畷銊︽綇閸撗呪棨婵犵數濞€濞佳囶敄閸℃稑纾婚柛宀€鍋涚粻鍦磼椤旀娼愭い顐攻缁绘盯姊荤€靛摜鐓撳┑顔硷功缁垳绮悢鐓庣劦妞ゆ帒瀚悞鍨亜閹哄秷鍏岄柕鍡樺浮閺屽秶鎲撮崟顐ｈ癁闂佸搫鏈惄顖氼嚕椤曗偓閸┾偓妞ゆ帒瀚崹鍌炴煕椤垵娅橀柛銈嗘礃閵囧嫰骞囬崜浣烘殸缂備讲鍋撻柛鎰ㄦ杺娴滄粓鏌￠崘銊︽悙濞存粌缍婇弻銊モ槈濞嗘垹鐓€闂佸疇顫夐崹鍧楀箖濞嗘挸绾ч柟瀵稿С濡楁捇姊绘担鍝勫付缂傚秴锕︾划濠氬冀椤撶喎浠掑銈嗘磵閸嬫挾鈧娲栭妶鎼佸箖閵忋倖鎯為柛锔诲幗椤苯鈹戦悩鍨毄闁稿鐩幃褔宕卞☉娆忊偓鑸电節闂堟侗鍎忛柛鎴犲█閺岋綁寮崹顔藉€梺缁樻尪閸庣敻寮婚敓鐘茬倞闁靛鍎遍‖鍫熺箾鐎涙鐭岄柛瀣枛閸┾偓妞ゆ巻鍋撻柣蹇旇壘椤灝顫滈埀顒勫极閸愵噮鏁傞柛顐ｇ箘閻ゅ洭姊虹紒妯哄闁圭⒈鍋勯弫顕€鏌ｉ悢鍝ョ煁缂侇喖鐬奸崣?
    //   闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾惧綊鏌熼梻瀵割槮缁炬儳缍婇弻鐔兼⒒鐎靛壊妲紒鐐劤缂嶅﹪寮婚悢鍏尖拻閻庨潧澹婂Σ顔剧磼閹冣挃闁硅櫕鎹囬垾鏃堝礃椤忎礁浜鹃柨婵嗙凹缁ㄥジ鏌熼惂鍝ョМ闁哄矉缍侀、姗€鎮欓幖顓燁棧闂備線娼уΛ娆戞暜閹烘缍栨繝闈涱儐閺呮煡鏌涘☉鍗炲妞ゃ儲鑹鹃埞鎴炲箠闁稿﹥顨嗛幈銊╂倻閽樺锛涢梺缁樺姉閸庛倝宕戠€ｎ喗鐓熸俊顖濆吹濠€浠嬫煃瑜滈崗娑氭濮橆剦鍤曢柡澶嬪焾濞尖晠寮堕崼姘殨闁靛繈鍊栭埛鎺懨归敐鍫綈闁稿濞€閺屾稒鎯旈姀掳浠㈤悗瑙勬礃缁捇寮崘顔肩＜婵﹩鍘鹃埀顒夊墴濮婃椽宕ㄦ繝鍌毿曢梺鍝ュУ椤ㄥ﹪骞冮敓鐘参ㄩ柍鍝勫€婚崢鎼佹⒑閹肩偛鍔撮柣鎾崇墕閳绘捇寮Λ鐢垫嚀椤劑宕奸姀銏℃瘒婵犳鍠栭敃銈夊箹椤愶絾娅忛梻浣规偠閸庢粓鍩€椤掑嫬纾婚柟鐐窞閺冨牆宸濇い鎾跺缁遍亶姊绘担绛嬫綈鐎规洘锕㈠畷娲冀瑜忛弳锕傛煕濞嗗浚妲虹紒鈾€鍋撻梻鍌氬€搁悧濠勭矙閹烘埈鍟呮繝闈涚墢绾惧ジ鏌嶉柨顖氫壕闂佺顑嗛幑鍥ь潖缂佹ɑ濯村〒姘煎灣閸旀悂姊洪崫鍕⒈闁告挻鐩畷姘跺箳閹寸姵娈曢梺鍛婃閸嬫劙宕楀鈧畷娲焵椤掍降浜滈柟鐑樺灥椤忣亪鏌嶉柨瀣瑨闂囧鏌ㄥ┑鍡楊伂妞ゆ帞鍠栭弻锝夊箳閺傚じ澹曢梺闈涙搐鐎氫即鐛€ｎ喗鍊烽柤纰卞厸閹綁姊绘担鐑樺殌缂佺姴绉瑰畷纭呫亹閹烘垹鍘撮梺鐟邦嚟婵參宕戦幘缁樻櫜閹煎瓨绻冮幑锝夋⒑绾懎袚婵炶尙鍠庨～蹇撁洪鍜佹濠电偞鐣崕閬嶆偋閹炬剚鍤曢柟缁樺坊濡插牓鏌曡箛鏇炐ユい銏犳嚇濮婃椽骞嗚缁傚鏌涚€ｎ亜鈧骞戦姀銈呭耿婵炴垶鐟ч崢顏堟⒑閸撴彃浜濈紒璇插€块崺鈧い鎺嗗亾闁硅绱曠划瀣吋婢跺鈧攱銇勯幒鎴濃偓濠氼敊閺囥垺鐓熼幖娣灮閳洘銇勯鐐村枠闁诡垰鐭傞獮鎺楀籍閸屾粣绱查梻浣虹帛閿氱痪缁㈠幗閺呭爼鎮界喊妯轰壕婵炲牆鐏濋弸锔姐亜閺囧棗娲ら悡鈥愁熆鐠哄ソ锟犳偄婵傚鍙嗛梺鍛婃处閸擄箑螞閸愵喗鍊甸悷娆忓绾炬悂鏌涢弮鈧崹鍧楀Υ娴ｈ倽鏃€鎷呴悷閭︹偓鎾绘⒑閸涘﹦鈽夐柨鏇檮缁傚秵銈ｉ崘鈹炬嫽闂佺鏈懝楣冨焵椤掑嫷妫戠紒顔肩墛缁楃喖鍩€椤掑嫮宓侀柡宥庡弾閺佸啴鏌ㄩ弴妤€浜鹃柣搴㈣壘椤︿即濡甸崟顖氱闁瑰瓨绺鹃崑鎾寸節濮橆厼鍓瑰┑鐐叉閹稿鎮″▎鎾崇骇闁割偅绻傞埛鏃堟煟閿濆鎲鹃柡宀嬬秮楠炴﹢顢涘Δ鈧禍楣冩煙妫颁浇鍏岄柛鐐垫暬閺岋綁鎮╅悜妯糕偓鍐偣閳ь剟鏁冮崒娑樹簵濡炪倖甯婇懗鍓佺不閸撗呯＜婵°倐鍋撻柟纰卞亝閹便劑宕掗悙瀵稿幐闁诲繒鍋涙晶钘壝虹€涙ǜ浜滈柕蹇婂墲缁€瀣煛娴ｇ懓濮嶇€规洖鐖奸崺锟犲礃閳哄偆鍟屽┑鐘殿暜缁辨洟宕戦幋锕€纾归柕鍫濐槸绾惧鏌涢埄鍏╂垿宕ｈ箛娑欑厱妞ゎ厽鍨垫禍鐐烘煃閻熸壆孝闁宠鍨块幃鈺呭矗婢跺妲遍梻浣侯焾閿曨亪寮ㄩ柆宥呂﹂柛鏇ㄥ枤閻も偓闂佸湱鍋撻崜姘闁秵鈷戠紒瀣儥閸庢劙鏌熼悷鐗堝枠闁绘侗鍣ｅ畷鍫曨敆閳ь剛鐥閹綊骞侀幒鎴濐瀴闂佺粯鎼徊鍓ф崲濠靛鍋ㄩ梻鍫熺▓閺嬪懎鈹戦悙鏉垮皟闁搞儴鍩栭弲鐐烘⒑閸涘﹣绶遍柛銊﹀▕閹矂宕卞☉娆戝幈闁诲繒鍋涙晶浠嬪煀閺囥垺鐓曟繛鍡楃箳缁犳彃菐閸パ嶈含闁诡喗鐟﹂敍鎰攽閸℃﹩鍞叉繝鐢靛仜閻°劎鍒掑澶婄？閻庡湱濮锋禍娆撴⒒娴ｈ櫣甯涢柨鏇樺灩椤洩顦崇紒鍌涘笒椤劑宕奸悢鍝勫箞闂備胶绮濠氣€﹂崼銉ョ厺闁哄洨鍋愰弨浠嬫煥濞戞ê顏柡鍡╁墯椤ㄣ儵鎮欓崣澶婃灎閻庢鍠栨晶搴ㄥ箲閸曨垪鈧箓骞嬪┑鍥ㄦ瘜闂傚倸鍊搁崐鐑芥嚄閸洖绠犻柟鐐た閺佸銇勯幘璺烘瀾闁告瑥绻橀弻鐔虹磼閵忕姵鐏堥梺缁樺笒閻忔岸濡甸崟顖氱闁瑰瓨绺鹃崑鎾诲川婵犲嫷娴勯柡澶婄墑閸斿秹宕ｈ箛鎾斀闁绘ɑ褰冮弳鐐烘煏閸ャ劎绠栧ǎ鍥э躬椤㈡洟濮€閻樿櫕顔勯梻浣哥枃濡嫰藝閺夋鐒介煫鍥ㄧ☉閻撴稑霉閿濆棗濡虫い蹇撶墛閳锋帡鏌涚仦鍓ф噯闁稿繐鏈妵鍕敇閻愰潧顤€濡炪們鍔婇崕闈涚暦椤愶箑唯闁靛鍠楅ˉ鈩冧繆閻愵亜鈧牠骞愰悙顒佸弿闁圭虎鍠栭崹鍌涚節闂堟稒顥戦柡鈧禒瀣厽婵☆垵顕х徊濠氭煃瑜滈崜娆撯€﹀畡閭﹀殨鐎规洖娲犻崑鎾绘晲鎼粹剝鐏嶉梺鎶芥敱閸ㄥ爼濡甸崟顖氱闁告鍋涢～鍥р攽閿涘嫯妾搁柛锝忕秮楠炲啫螖閸涱噮妫冨┑鐐村灦濮樸劑宕濋姘ｆ斀妞ゆ梻銆嬮弨缁樹繆閻愯埖顥夐摶鐐烘煕閹扳晛濡锋俊鎻掔墛閹便劌顫滈崱妤€鈷掗梺鍝勬－閸嬪嫰鍩為幋鐐茬疇闂佺锕ラ〃鍡涘箞閵娾晛绠绘い鏃囧亹閻ゅ懘姊洪幐搴ｂ槈閻庢凹鍣ｉ幆灞惧緞鐏炵浜炬鐐茬仢閸旀碍銇勯敂璇茬仸鐎规洘锕㈤崺鈧い鎺嗗亾妞ゎ亜鍟存俊鍫曞幢濡儤娈梻浣告憸婵敻骞戦崶褏鏆﹂柕蹇婂墲缂嶅洭鏌曟繛褍鎳愬Σ鍥⒒娴ｅ湱婀介柛銊ㄦ椤洩顦查柣鈽嗗弮濮婄粯鎷呴崨濠冨枑闂佸摜濮甸崝鏍博閻旂厧骞㈡繛鍡楃箰閻忓﹥绻濋悽闈浶ｇ痪鏉跨Ч瀹曟劖顦版惔锝嗭紡闂佺粯顨呴悡顐︻敂閸涱垼娲搁梺缁樺姦閸撴稓绮绘ィ鍐╃厱妞ゆ劧绲跨粻妯好归悩顔肩伈闁哄矉绱曢埀顒婄秵閸嬪棝鍩婇弴銏＄厪闁搞儜鍐句純濡炪們鍨洪敃銏ゅ箖閳哄懎绠甸柟鐑樺灩椤撳搫鈹戞幊閸婃鎱ㄩ悜钘夌；婵炴垯鍨归悿顕€鎮楀☉娅虫垿宕ｈ箛娑欑厓鐟滄粓宕滈悢鐓庤摕闁哄洢鍨归柋鍥ㄧ節闂堟稒绁╂俊顐ゅ仱濮婃椽鏌呴悙鑼跺濠⒀勫缁辨帡顢氶崨顓犱画缂備礁鐭佹ご鍝ユ崲濠靛鐐婇柤绋跨仛濞呮牗绻濋悽闈涒枅婵炰匠鍏犲綊宕掑☉姘兼祫闂佸啿鎼幊蹇涘磻閳╁啰绡€濠电姴鍊归崳瑙勩亜閿濆懌鍋㈤柡宀€鍠撶划娆撳垂椤旇姤鐦ｆ俊鐐€ら崑鍕崲閹烘梹顫曢柟鐑樺殾閻旂儤瀚氱€瑰壊鍠掗崑鎾诲箻缂佹ǚ鎷洪梺鍏间航閸庡秹顢旈崺璺烘喘椤㈡瑦寰勭€碘€冲悩閺冨牆宸濇い鏃囶潐鐎氬ジ姊绘担鍛婂暈闁告梹鐗為妵鎰板礃閵婂函绲剧换婵嗩潩椤撶姴骞楁繝寰锋澘鈧捇鎮為敂鍙ョ剨妞ゆ挶鍨洪悡鐔兼煥濠靛棙鍣规俊鑼帛閵囧嫰顢樺鍐潎閻庤娲橀敃銏ゅ极閹版澘骞㈤柍鍝勫€荤粔楣冩⒒閸屾艾鈧娆㈠顒夌劷鐟滃繘骞戦姀銈呭耿婵炴垶顭囬弻褍鈹戦悩璇у伐闁绘妫濋幃鎸庛偅閸愨晝鍘撻梺鍛婄箓鐎氼參宕冲ú顏呯厓闂佸灝顑呴悘鈺呮煟閵夘喕閭い銏★耿閹瑩寮堕幋鐑嗕画闂佽崵鍠愮划宥嗕繆閹间礁鐐婇柕濞垮灪鐎氫粙姊绘担鍛婂暈婵炶绠撳畷鎴﹀礋椤栵絾鏅滃銈嗘尪閸ㄦ椽鎮?
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

        if (currentContractIds.length > 0) {
          task.contractIds = [...new Set([...(task.contractIds || []), ...currentContractIds])];
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
  const seenTaskIds = new Map();

  tasks.forEach((task, index) => {
    const taskNum = index + 1;
    const taskLabel = task.title ? `"${task.title}"` : `Task ${taskNum}`;

    // Check required fields
    if (!task.title) {
      errors.push({
        line: task.lineNumber,
        message: `Task ${taskNum}: title is required`,
        suggestion: 'add text after "- [ ]"',
      });
    }

    if (task.id) {
      if (!isValidTaskId(task.id)) {
        errors.push({
          line: task.lineNumber,
          message: `${taskLabel}: invalid stable id ${task.id}`,
          suggestion: 'use ids like [id:task_example]',
        });
      } else if (seenTaskIds.has(task.id)) {
        errors.push({
          line: task.lineNumber,
          message: `${taskLabel}: duplicate stable id ${task.id}`,
          suggestion: 'keep each [id:task_xxx] unique within the file',
        });
      } else {
        seenTaskIds.set(task.id, taskLabel);
      }
    }

    if (task.contractIds?.length > 0) {
      task.contractIds.forEach((contractId) => {
        if (!isValidContractId(contractId)) {
          errors.push({
            line: task.lineNumber,
            message: `${taskLabel}: invalid contract id ${contractId}`,
            suggestion: 'use ids like [contracts:contract.domain.action]',
          });
        }
      });
    }

    if (task.contractRole && !Object.values(CONTRACT_ROLES).includes(task.contractRole)) {
      warnings.push({
        line: task.lineNumber,
        message: `${taskLabel}: invalid contract role ${task.contractRole}`,
        suggestion: `use one of: ${Object.values(CONTRACT_ROLES).join(', ')}`,
      });
    }

    // Check priority
    if (!['P0', 'P1', 'P2', 'P3'].includes(task.priority)) {
      warnings.push({
        line: task.lineNumber,
        message: `${taskLabel}: invalid priority ${task.priority}`,
        suggestion: 'use P0, P1, P2, or P3',
      });
    }

    // Check hours
    if (task.estimatedHours < 0) {
      errors.push({
        line: task.lineNumber,
        message: `${taskLabel}: estimated hours cannot be negative`,
      });
    }

    // Warn if large task has no description
    if (!task.description && task.estimatedHours > 4) {
      warnings.push({
        line: task.lineNumber,
        message: `${taskLabel}: large task (${task.estimatedHours}h) has no description`,
        suggestion: 'add an indented description line or metadata block below the task',
      });
    }
  });

  return { errors, warnings };
}

function formatValidationIssue(issue) {
  const linePrefix = issue.line ? `Line ${issue.line}: ` : '';
  const suggestion = issue.suggestion ? ` | fix: ${issue.suggestion}` : '';
  return `${linePrefix}${issue.message}${suggestion}`;
}

function printMarkdownImportHints(logger = console.error) {
  logger(chalk.blue('\nAccepted task patterns:'));
  logger(chalk.gray('  - [ ] Task title [P1] [id:task_example] [dependency:task_other]'));
  logger(chalk.gray('  - [ ] Task title [contracts:contract.user.create] [contract-role:producer] [files:src/api.ts]'));
  logger(chalk.gray('    priority: P1'));
  logger(chalk.gray('    estimate: 2h'));
  logger(chalk.gray('    depends: task_other'));
  logger(chalk.gray('  ## Contract: contract.user.create'));
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
    }
  });
}

function buildPlanningUpdatePayload(taskData) {
  return {
    title: taskData.title,
    description: taskData.description,
    priority: taskData.priority,
    tags: taskData.tags,
    estimatedHours: taskData.estimatedHours,
    assignee: taskData.assignee,
    dependencies: taskData.dependencies,
    contractIds: taskData.contractIds,
    contractRole: taskData.contractRole,
    boundFiles: taskData.boundFiles,
    subtasks: taskData.subtasks || [],
  };
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
      printMarkdownImportHints(console.log);
      return;
    }

    // Validate tasks
    if (spinner) spinner.text = 'Validating tasks';
    const { errors, warnings } = validateTasks(tasks);

    if (errors.length > 0) {
      spinner?.fail('Validation failed');
      console.error(chalk.red('\nValidation errors:'));
      errors.forEach((error) => console.error(chalk.red(`  - ${formatValidationIssue(error)}`)));
      if (warnings.length > 0) {
        console.error(chalk.yellow('\nWarnings:'));
        warnings.forEach((warning) => console.error(chalk.yellow(`  - ${formatValidationIssue(warning)}`)));
      }
      printMarkdownImportHints(console.error);
      process.exit(1);
    }

    // Show warnings if any
    if (warnings.length > 0 && !options.force) {
      spinner?.warn('Validation warnings');
      console.log(chalk.yellow('\nWarnings:'));
      warnings.forEach((warning) => console.log(chalk.yellow(`  - ${formatValidationIssue(warning)}`)));

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
    const existingById = new Map();

    existingTasks.forEach(task => {
      const hash = generateTaskHash(task.title, task.description);
      existingHashes.set(hash, task);
      existingById.set(task.id, task);
    });

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      duplicates: []
    };

    const importedTasks = [];

    for (const taskData of tasks) {
      const hash = generateTaskHash(taskData.title, taskData.description);
      const existing = taskData.id ? existingById.get(taskData.id) : existingHashes.get(hash);

      if (!existing) {
        // New task - create
        const created = await manager.createTask({
          id: taskData.id,
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
          dependencies: taskData.dependencies,
          contractIds: taskData.contractIds,
          contractRole: taskData.contractRole,
          boundFiles: taskData.boundFiles,
        });

        created.subtasks = taskData.subtasks || [];
        importedTasks.push(created);
        results.created++;
        existingById.set(created.id, created);
      }
      else if (options.update) {
        // Task exists - update
        await manager.updateTask(existing.id, buildPlanningUpdatePayload(taskData));
        importedTasks.push(manager.getTask(existing.id));
        results.updated++;
      }
      else if (options.force) {
        // Force create - don't check duplicates
        const created = await manager.createTask({
          id: taskData.id,
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          tags: taskData.tags,
          estimatedHours: taskData.estimatedHours,
          assignee: taskData.assignee,
          dependencies: taskData.dependencies,
          contractIds: taskData.contractIds,
          contractRole: taskData.contractRole,
          boundFiles: taskData.boundFiles,
        });

        created.subtasks = taskData.subtasks || [];
        importedTasks.push(created);
        results.created++;
        existingById.set(created.id, created);
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
    resolveDependencies(importedTasks, manager.getTasks());

    // Update tasks with resolved dependencies and subtasks
    for (const task of importedTasks) {
      await manager.updateTask(task.id, {
        dependencies: task.dependencies,
        contractIds: task.contractIds,
        contractRole: task.contractRole,
        boundFiles: task.boundFiles,
        subtasks: task.subtasks
      });
    }

    // Final save
    await manager.saveData();

    spinner?.succeed('Tasks imported successfully');

    const countByPriority = { P0: 0, P1: 0, P2: 0, P3: 0 };
    let dependencyCount = 0;
    let subtaskCount = 0;
    importedTasks.forEach(task => {
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

    if (options.verbose && importedTasks.length > 0) {
      console.log(chalk.blue('\nVerbose imported task list:'));
      importedTasks.forEach((task, index) => {
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
      printMarkdownImportHints(console.error);
    }

    process.exit(1);
  }
}
