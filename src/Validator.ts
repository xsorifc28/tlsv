export enum ValidationPart {
  InputData = 0,
  FileFormat = 1,
  ChannelCount = 2,
  FseqType = 3,
  Duration = 4,
  Memory = 5,
}

export class ValidationCheckResults {
  isValid: boolean;
  message: string;

  constructor(isValid: boolean, message: string) {
    this.isValid = isValid
    this.message = message
  }
}

/**
 * Validation result type
 * Validation result is considered valid if `isValid` on the ValidationCheckResults of each element in `results` is true.
 * Other fields, if available, are returned to aid in building detailed errors or descriptions
 * @typedef {Object} ValidationResults - creates a new type named 'ValidationResults'
 * @property {number} [frameCount=0] - number of frames
 * @property {number} [memoryUsage=0] - memory usage, ranging from 0 to 1 (1 = 100%), commandCount / 681 = memoryUsage
 * @property {number} [duration=0] - duration in milliseconds
 * @property {number} [commandCount=0] - number of commands, maximum being 681. commandCount / 681 = memoryUsage
 * @property {number} [stepTime=0] - duration between frames
 * @property {{ [key: number]: ValidationCheckResults }} [results=[]] - results of each check that was performed
 */
export type ValidationResults = {
  frameCount: number;
  memoryUsage: number;
  duration: number;
  commandCount: number;
  stepTime: number;
  results: { [key: number]: ValidationCheckResults };
};

/**
 * Validates a FSEQ file per specs defined at https://github.com/teslamotors/light-show
 * @param {(ArrayBuffer|ArrayBufferLike)} data
 * @returns ValidationResults
 */
export default (data: ArrayBuffer | ArrayBufferLike): ValidationResults => {
  const validationResult: ValidationResults = {
    commandCount: 0,
    duration: 0,
    frameCount: 0,
    memoryUsage: 0,
    stepTime: 0,
    results: [],
  }

  const isValid = true
  const isInvalid = false

  if(!data) {
    const message = 'An input type of ArrayBuffer or ArrayBufferLike must be provided!';
    validationResult.results[ValidationPart.InputData] = new ValidationCheckResults(isInvalid, message)
    return validationResult;
  } else {
    validationResult.results[ValidationPart.InputData] = new ValidationCheckResults(isValid, "")
  }

  const MEMORY_LIMIT = 681;
  const arraysEqual = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  const magic = String.fromCharCode(...new Uint8Array(data.slice(0, 4)));

  const header = new DataView(data.slice(0, 22));

  const start = header.getUint8(4);
  const minor = header.getUint8(6);
  const major = header.getUint8(7);
  const chCount = header.getUint32(10, true);

  validationResult.frameCount = header.getUint32(14, true);
  validationResult.stepTime = header.getUint8(18);

  const compressionType = header.getUint8(20);

  if(magic !== 'PSEQ' || start < 24 || validationResult.frameCount < 1 || validationResult.stepTime < 15 || minor !== 0 || major !== 2) {
    const message = 'Unknown file format, expected FSEQ v2.0'
    validationResult.results[ValidationPart.FileFormat] = new ValidationCheckResults(isInvalid, message);
    return validationResult
  } else {
    validationResult.results[ValidationPart.FileFormat] = new ValidationCheckResults(isValid, 'File format is valid.');
  }

  if(chCount !== 48) {
    const message = `Expected 48 channels, got ${chCount}`;
    validationResult.results[ValidationPart.ChannelCount] = new ValidationCheckResults(isInvalid, message);
    return validationResult;
  } else {
    validationResult.results[ValidationPart.ChannelCount] = new ValidationCheckResults(isValid, 'Channel count valid.');
  }

  if(compressionType !== 0) {
    const message = 'Expected file format to be V2 Uncompressed';
    validationResult.results[ValidationPart.FseqType] = new ValidationCheckResults(isInvalid, message);
    return validationResult;
  } else {
    validationResult.results[ValidationPart.FseqType] = new ValidationCheckResults(isValid, 'File FSEQ format is valid.');
  }

  validationResult.duration = (validationResult.frameCount * validationResult.stepTime);
  if(validationResult.duration > 5 * 60 * 1000) {
    const durationStr = new Date(validationResult.duration).toISOString().substr(11, 12);
    const message = `Expected total duration to be less than 5 minutes, got ${durationStr}`;
    validationResult.results[ValidationPart.Duration] = new ValidationCheckResults(isInvalid, message);
  } else {
    validationResult.results[ValidationPart.Duration] = new ValidationCheckResults(isValid, '');
  }

  let prevLight: number[] = [];
  let prevRamp: number[] = [];
  let prevClosure1: number[] = [];
  let prevClosure2: number[] = [];
  let pos = start;

  const LIGHT_BUFFER_LEN = 30;
  const CLOSURE_BUFFER_LEN = 16;
  const GAP = 2;

  for (let i = 0; i < validationResult.frameCount; i++) {
    const lights = new Uint8Array(data.slice(pos, pos + LIGHT_BUFFER_LEN));
    pos += LIGHT_BUFFER_LEN;

    const closures = new Uint8Array(data.slice(pos, pos + CLOSURE_BUFFER_LEN));
    pos += CLOSURE_BUFFER_LEN;

    const light_state = Array.from(lights.map((b) => (b > 127 ? 1 : 0)));
    const ramp_state = Array.from(
      lights
        .slice(0, 14)
        .map((b) =>
          Math.min((Math.floor((b > 127 ? 255 - b : b) / 13) + 1) / 2, 3)
        )
    );
    const closure_state = Array.from(
      closures.map((b) => Math.floor(Math.floor(b / 32) + 1) / 2)
    );

    if(!arraysEqual(light_state, prevLight)) {
      prevLight = light_state;
      validationResult.commandCount++;
    }

    if(!arraysEqual(ramp_state, prevRamp)) {
      prevRamp = ramp_state;
      validationResult.commandCount++;
    }

    if(!arraysEqual(closure_state.slice(0, 10), prevClosure1)) {
      prevClosure1 = closure_state.slice(0, 10);
      validationResult.commandCount++;
    }

    if(!arraysEqual(closure_state.slice(10), prevClosure2)) {
      prevClosure2 = closure_state.slice(10);
      validationResult.commandCount++;
    }

    pos += GAP;
  }

  validationResult.memoryUsage = validationResult.commandCount / MEMORY_LIMIT;

  if(validationResult.memoryUsage > 1) {
    const memoryUsageFormatted = parseFloat((validationResult.memoryUsage * 100).toFixed(2));
    const memError = `Used ${memoryUsageFormatted}% of available memory! Sequence uses ${validationResult.commandCount} commands, but the maximum allowed is ${MEMORY_LIMIT}!`;
    validationResult.results[ValidationPart.Memory] = new ValidationCheckResults(isInvalid, memError);
  } else {
    validationResult.results[ValidationPart.Memory] = new ValidationCheckResults(isValid, '');
  }

  return validationResult;
};