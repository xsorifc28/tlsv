/**
 * Validation result type
 * Validation result is considered valid if error field is undefined
 * If the error field is specified, an error message will be built and the validation should be considered invalid
 * Other fields, if available, are returned to aid in building detailed errors or descriptions
 */
export type ValidationResults = {
  frameCount?: number;
  memoryUsage?: number;
  durationSecs?: number;
  commandCount?: number;
  stepTime?: number;
  error: string | undefined;
};

/**
 * Validates a FSEQ file per specs defined at https://github.com/teslamotors/light-show
 * @param {(ArrayBuffer|ArrayBufferLike)} data
 * @returns {{error: string}|{frameCount: number, memoryUsage: number, durationSecs: number, commandCount: number, stepTime: number, error: string}}
 */
export default (data: ArrayBuffer | ArrayBufferLike): ValidationResults => {
  if (!data) {
    return {
      error: 'Error - file is corrupt or has no data',
    };
  }

  const MEMORY_LIMIT = 681;
  const arraysEqual = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  let error;

  const magic = String.fromCharCode(...new Uint8Array(data.slice(0, 4)));

  const header = new DataView(data.slice(0, 22));

  const start = header.getUint8(4);
  const minor = header.getUint8(6);
  const major = header.getUint8(7);
  const chCount = header.getUint32(10, true);
  const frameCount = header.getUint32(14, true);
  const stepTime = header.getUint8(18);
  const compressionType = header.getUint8(20);

  if (
    magic !== 'PSEQ' ||
    start < 24 ||
    frameCount < 1 ||
    stepTime < 15 ||
    minor !== 0 ||
    major !== 2
  ) {
    return {
      error: 'Unknown file format, expected FSEQ v2.0',
    };
  }

  if (chCount !== 48) {
    return {
      error: `Expected 48 channels, got ${chCount}`,
    };
  }

  if (compressionType !== 0) {
    return {
      error: 'Expected file format to be V2 Uncompressed',
    };
  }

  const durationSecs = (frameCount * stepTime) / 1000;
  if (durationSecs > 5 * 60) {
    error = `Expected total duration to be less than 5 minutes, got ${new Date(
      durationSecs * 1000
    )
      .toISOString()
      .substr(11, 12)}`;
  }

  let prevLight: number[] = [];
  let prevRamp: number[] = [];
  let prevClosure1: number[] = [];
  let prevClosure2: number[] = [];
  let commandCount = 0;
  let pos = start;

  const LIGHT_BUFFER_LEN = 30;
  const CLOSURE_BUFFER_LEN = 16;
  const GAP = 2;

  for (let i = 0; i < frameCount; i++) {
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

    if (!arraysEqual(light_state, prevLight)) {
      prevLight = light_state;
      commandCount++;
    }

    if (!arraysEqual(ramp_state, prevRamp)) {
      prevRamp = ramp_state;
      commandCount++;
    }

    if (!arraysEqual(closure_state.slice(0, 10), prevClosure1)) {
      prevClosure1 = closure_state.slice(0, 10);
      commandCount++;
    }

    if (!arraysEqual(closure_state.slice(10), prevClosure2)) {
      prevClosure2 = closure_state.slice(10);
      commandCount++;
    }

    pos += GAP;
  }

  const memoryUsage = commandCount / MEMORY_LIMIT;

  if (memoryUsage > 1) {
    const memoryUsageFormatted = parseFloat((memoryUsage * 100).toFixed(2));
    const memError = `Used ${memoryUsageFormatted}% of available memory! Sequence uses ${commandCount} commands, but the maximum allowed is ${MEMORY_LIMIT}!`;
    if(error) {
      error += ', ' + memError;
    } else {
      error = memError
    }
  }

  return {
    frameCount,
    stepTime,
    durationSecs,
    memoryUsage,
    commandCount,
    error,
  };
};
