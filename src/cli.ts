#!/usr/bin/env node
import * as fs from 'fs';
import Validator, {ValidationResults, buildErrorMessages} from './Validator';

const file = fs.readFileSync(process.argv[2]);
const fileArrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
const validation: ValidationResults = Validator(fileArrayBuffer);

if (validation.errors.length > 0) {
	const errorMessages = buildErrorMessages(validation);

	for (let message of Object.values(errorMessages)) {
		console.error('VALIDATION ERROR:', message);
	};
} else {
  const durationFormatted = new Date(validation.duration * 1000).toISOString().substr(11, 12);
  const memoryUsage = parseFloat((validation.memoryUsage * 100).toFixed(2));
  console.log(`Found ${validation.frameCount} frames, step time of ${validation.stepTime} ms for a total duration of ${durationFormatted}`);
  console.log(`Used ${memoryUsage}% of the available memory`);
};
