/**
 * Types of errors that can be returned by the validator
 * Note that the order of the enum MUST NOT be changed as changes would be backwards incompatible
 */
export enum ErrorType {
  InputData = 0,
  FileFormat = 1,
  ChannelCount = 2,
  FseqType = 3,
  Duration = 4,
  Memory = 5,
}

// Global default values
const MEMORY_LIMIT = 3500;

/**
 * Validation result type
 * Validation result is considered valid if the errors array is empty, otherwise invalid.
 * Other fields, if available, are returned to aid in building detailed errors or descriptions
 * @typedef {Object} ValidationResults - creates a new type named 'ValidationResults'
 * @property {number} [frameCount=0] - number of frames
 * @property {number} [memoryUsage=0] - memory usage, ranging from 0 to 1 (1 = 100%), commandCount / 3500 = memoryUsage
 * @property {number} [duration=0] - duration in milliseconds
 * @property {number} [commandCount=0] - number of commands, maximum being 3500. commandCount / 3500 = memoryUsage
 * @property {number} [stepTime=0] - duration between frames
 * @property {ErrorType[]} [errors=[]] - If length > 0, contains the errors that were found. If it's empty, the validation result is valid.
 */
export type ValidationResults = {
  frameCount: number;
  memoryUsage: number;
  duration: number;
  commandCount: number;
  stepTime: number;
  channelCount: number;
  errors: ErrorType[];
};

/**
 * Validates a FSEQ file per specs defined at https://github.com/teslamotors/light-show
 * @param {(ArrayBuffer|ArrayBufferLike)} data
 * @returns ValidationResults
 */
export default (data: ArrayBuffer | ArrayBufferLike): ValidationResults => {
  const validationResult: ValidationResults = {
    frameCount: 0,
    memoryUsage: 0,
    duration: 0,
    commandCount: 0,
    stepTime: 0,
    channelCount: 0,
    errors: [],
  };

  if(!data) {
    validationResult.errors.push(ErrorType.InputData);
    return validationResult;
  }

  const arraysEqual = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  const magic = String.fromCharCode(...new Uint8Array(data.slice(0, 4)));

  const header = new DataView(data.slice(0, 22));

  const start = header.getUint8(4);
  const minor = header.getUint8(6);
  const major = header.getUint8(7);
  const chCount = header.getUint32(10, true);

  validationResult.frameCount = header.getUint32(14, true);
  validationResult.channelCount = chCount
  validationResult.stepTime = header.getUint8(18);

  const compressionType = header.getUint8(20);

  if(magic !== 'PSEQ' || start < 24 || validationResult.frameCount < 1 || validationResult.stepTime < 15 || ((minor !== 0) && (minor !== 2)) || major !== 2) {
    validationResult.errors.push(ErrorType.FileFormat);
    return validationResult;
  }

  if(chCount !== 48) {
    validationResult.errors.push(ErrorType.ChannelCount);
    return validationResult;
  }

  if(compressionType !== 0) {
    validationResult.errors.push(ErrorType.FseqType);
    return validationResult;
  }

  validationResult.duration = (validationResult.frameCount * validationResult.stepTime);
  if(validationResult.duration > 5 * 60 * 1000) {
    validationResult.errors.push(ErrorType.Duration);
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
    validationResult.errors.push(ErrorType.Memory);
  }

  return validationResult;
};

export function buildErrorMessages(validationResult: ValidationResults): string[] {
  const errorMessages: string[] = [];

  validationResult.errors.forEach(error => {
    switch(error) {
      case ErrorType.InputData:
        errorMessages.push('An input type of ArrayBuffer or ArrayBufferLike must be provided!');
        break;
      case ErrorType.FileFormat:
        errorMessages.push('Unknown file format, expected FSEQ v2.0');
        break;
      case ErrorType.ChannelCount:
        errorMessages.push(`Expected 48 channels, got ${validationResult.channelCount}`);
        break;
      case ErrorType.FseqType:
        errorMessages.push('Expected file format to be V2 Uncompressed');
        break;
      case ErrorType.Duration:
        errorMessages.push(`Expected total duration to be less than 5 minutes, got ${new Date(validationResult.duration).toISOString().substr(11, 12)}`);
        break;
      case ErrorType.Memory:
        errorMessages.push(`Used ${parseFloat((validationResult.memoryUsage * 100).toFixed(2))}% of available memory! Sequence uses ${validationResult.commandCount} commands, but the maximum allowed is ${MEMORY_LIMIT}!`);
    }
  });

  return errorMessages;
}
