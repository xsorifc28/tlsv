#!/usr/bin/env node
import * as fs from 'fs';
import Validator, {ValidationResults} from "./Validator";

const validation: ValidationResults = Validator(fs.readFileSync(process.argv[2]).buffer);

if(validation.error) {
  console.error('VALIDATION ERROR:', validation.error);
  process.exit(1);
} else {
  const durationFormatted = new Date(validation.duration * 1000).toISOString().substr(11, 12);
  const memoryUsage = parseFloat((validation.memoryUsage * 100).toFixed(2))
  console.log(`Found ${validation.frameCount} frames, step time of ${validation.stepTime} ms for a total duration of ${durationFormatted}`);
  console.log(`Used ${memoryUsage}% of the available memory`);
}
