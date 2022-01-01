#!/usr/bin/env node
import * as fs from 'fs';
import Validator, {ValidationResults} from './Validator';

const validation: ValidationResults = Validator(fs.readFileSync(process.argv[2]).buffer);

var anyErrorExist = false;
for (let key in validation.results) {
  const result = validation.results[key];
  if (result.isValid == false) {
    console.error('VALIDATION ERROR:', result.message);
    anyErrorExist = true;
  };
};

if (!anyErrorExist) {
  const durationFormatted = new Date(validation.duration * 1000).toISOString().substr(11, 12);
  const memoryUsage = parseFloat((validation.memoryUsage * 100).toFixed(2))
  console.log(`Found ${validation.frameCount} frames, step time of ${validation.stepTime} ms for a total duration of ${durationFormatted}`);
  console.log(`Used ${memoryUsage}% of the available memory`);
}