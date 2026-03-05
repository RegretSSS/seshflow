#!/usr/bin/env node

/**
 * Fix data types in tasks.json
 * This script converts actualHours from strings to numbers
 */

import fs from 'fs';
import path from 'path';

const tasksFilePath = path.join(process.cwd(), '.seshflow', 'tasks.json');

async function fixDataTypes() {
  try {
    // Read tasks.json
    const content = await fs.promises.readFile(tasksFilePath, 'utf-8');
    const data = JSON.parse(content);

    if (!data.tasks || !Array.isArray(data.tasks)) {
      console.error('Invalid tasks.json format');
      process.exit(1);
    }

    let fixedCount = 0;

    // Fix actualHours for each task
    data.tasks.forEach(task => {
      if (task.actualHours !== undefined) {
        const originalValue = task.actualHours;
        const fixedValue = parseFloat(task.actualHours) || 0;

        if (typeof originalValue !== 'number') {
          task.actualHours = fixedValue;
          fixedCount++;
          console.log(`Fixed task ${task.id}: "${originalValue}" -> ${fixedValue}`);
        }
      }

      // Fix estimatedHours if it's a string
      if (task.estimatedHours !== undefined && typeof task.estimatedHours !== 'number') {
        const originalValue = task.estimatedHours;
        const fixedValue = parseFloat(task.estimatedHours) || 0;

        task.estimatedHours = fixedValue;
        fixedCount++;
        console.log(`Fixed task ${task.id}: estimatedHours "${originalValue}" -> ${fixedValue}`);
      }
    });

    if (fixedCount > 0) {
      // Write back to file
      await fs.promises.writeFile(tasksFilePath, JSON.stringify(data, null, 2));
      console.log(`\n✓ Fixed ${fixedCount} data type issues`);
    } else {
      console.log('No data type issues found');
    }

  } catch (error) {
    console.error('Error fixing data types:', error.message);
    process.exit(1);
  }
}

fixDataTypes();
