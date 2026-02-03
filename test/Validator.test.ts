import type { ValidationResults } from "../src/Validator";
import { Validator, ErrorType, buildErrorMessages } from '../src/index'
import * as fs from 'fs';
import * as path from 'path';

function readFile(filePath: string): Buffer {
  return fs.readFileSync(path.join(__dirname, filePath));
}

function convertBufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

describe('Validator', () => {
  describe('Valid', () => {
    it('should execute validation (valid)', () => {
      const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(readFile('sampleFiles/lightshow_valid.fseq')));
      expect(Object.keys(validationResult).length).toBe(7);
      expect(validationResult.frameCount).toBe(2247);
      expect(validationResult.stepTime).toBe(20);
      expect(validationResult.duration).toBe(44940);
      expect(validationResult.memoryUsage).toBeGreaterThan(0.030);
      expect(validationResult.memoryUsage).toBeLessThan(0.033);
      expect(validationResult.commandCount).toBe(112);
      expect(validationResult.channelCount).toBe(48);
      expect(validationResult.errors.length).toBe(0);
    });

    it('should execute validation (valid #2)', () => {
      const buffer = readFile('sampleFiles/route66_time.fseq');
      const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(buffer));
      expect(validationResult).toEqual({
        errors: [],
        commandCount: 211,
        duration: 192480,
        frameCount: 9624,
        memoryUsage: 0.06028571428571428,
        stepTime: 20,
        channelCount: 48,
      });
    });
  });

  describe('Invalid', () => {
    describe('Bad Input', () => {
      it('should return error (no data)', () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const validationResult: ValidationResults = Validator();
        expect(validationResult).toEqual({
          errors: [ErrorType.InputData],
          commandCount: 0,
          duration: 0,
          frameCount: 0,
          memoryUsage: 0,
          stepTime: 0,
          channelCount: 0,
        });
      });

      it('should return error (unknown \'magic\' format)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[0] = 79;
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(buffer));
        expect(validationResult).toEqual({
          errors: [ErrorType.FileFormat],
          commandCount: 0,
          duration: 0,
          frameCount: 2247,
          memoryUsage: 0,
          stepTime: 20,
          channelCount: 48,
        });
      });

      it('should return error (minor = 3)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[6] = 3;
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(buffer));
        expect(validationResult).toEqual({
          errors: [ErrorType.FileFormat],
          commandCount: 0,
          duration: 0,
          frameCount: 2247,
          memoryUsage: 0,
          stepTime: 20,
          channelCount: 48,
        });
      });

      it('should return error (not 48 channels)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[11] = 79;
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(buffer));
        expect(validationResult).toEqual({
          errors: [ErrorType.ChannelCount],
          commandCount: 0,
          duration: 0,
          frameCount: 2247,
          memoryUsage: 0,
          stepTime: 20,
          channelCount: 20272,
        });
      });

      it('should return error (compressionType=1)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[20] = 3;
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(buffer));
        expect(validationResult).toEqual({
          errors: [ErrorType.FseqType],
          commandCount: 0,
          duration: 0,
          frameCount: 2247,
          memoryUsage: 0,
          stepTime: 20,
          channelCount: 48,
        });
      });

      it('should return error (duration > 5m)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[18] = 255;
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(buffer));
        expect(validationResult).toEqual({
          errors: [ErrorType.Duration],
          commandCount: 112,
          duration: 572985,
          frameCount: 2247,
          memoryUsage: 0.032,
          stepTime: 255,
          channelCount: 48,
        });
      });
    });

    describe('Memory and Duration', () => {
      it('should execute validation (memory > 100%) #2', () => {
        const buffer = readFile('sampleFiles/lightshow_mem_34.fseq');
        buffer[18] = 20;
        const newBuffer = Buffer.concat(
          [
            buffer,
            Buffer.from(buffer.slice(148, buffer.length)),
            Buffer.from(buffer.slice(148, buffer.length)),
            Buffer.from(buffer.slice(148, buffer.length))
          ]
        );
        newBuffer[14] = 84;
        newBuffer[15] = 48;
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(newBuffer));
        expect(Object.keys(validationResult).length).toBe(7);
        expect(validationResult.frameCount).toBe(12372);
        expect(validationResult.stepTime).toBe(20);
        expect(validationResult.duration).toBe(247440);
        expect(validationResult.memoryUsage).toBeGreaterThan(1.35);
        expect(validationResult.memoryUsage).toBeLessThan(1.36);
        expect(validationResult.commandCount).toBe(4738);
        expect(validationResult.channelCount).toBe(48);
        expect(validationResult.errors.length).toBe(1);
        expect(validationResult.errors).toContain(ErrorType.Memory);
      });

      it('should execute validation (memory > 100%, duration > 5m)', () => {
        const buffer = readFile('sampleFiles/lightshow_mem_34.fseq');
        buffer[18] = 255;
        const newBuffer = Buffer.concat(
          [
            buffer,
            Buffer.from(buffer.slice(148, buffer.length)),
            Buffer.from(buffer.slice(148, buffer.length))
          ]
        );
        newBuffer[14] = 63;
        newBuffer[15] = 36;
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(newBuffer));
        expect(Object.keys(validationResult).length).toBe(7);
        expect(validationResult.frameCount).toBe(9279);
        expect(validationResult.stepTime).toBe(255);
        expect(validationResult.duration).toBe(2366145);
        expect(validationResult.memoryUsage).toBeGreaterThan(1.01);
        expect(validationResult.memoryUsage).toBeLessThan(1.02);
        expect(validationResult.commandCount).toBe(3554);
        expect(validationResult.channelCount).toBe(48);
        expect(validationResult.errors.length).toBe(2);
        expect(validationResult.errors).toContain(ErrorType.Duration);
        expect(validationResult.errors).toContain(ErrorType.Memory);
      });
    });

    describe('Validation error messages', () => {
      const validationResult: ValidationResults = {
        frameCount: 0,
        memoryUsage: 0,
        duration: 0,
        commandCount: 0,
        stepTime: 0,
        channelCount: 0,
        errors: [],
      };

      it('should output input data error message', () => {
        validationResult.errors = [ErrorType.InputData];
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(1);
        expect(errorMessages).toContain('An input type of ArrayBuffer or ArrayBufferLike must be provided!');
      });

      it('should output file format error message', () => {
        validationResult.errors = [ErrorType.FileFormat];
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(1);
        expect(errorMessages).toContain('Unknown file format, expected FSEQ v2.0');
      });

      it('should output channel count error message', () => {
        validationResult.errors = [ErrorType.ChannelCount];
        validationResult.channelCount = 281;
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(1);
        expect(errorMessages).toContain(`Expected 48 channels, got ${validationResult.channelCount}`);
      });

      it('should output file format (V2 Uncompressed) error message', () => {
        validationResult.errors = [ErrorType.FseqType];
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(1);
        expect(errorMessages).toContain('Expected file format to be V2 Uncompressed');
      });

      it('should output duration error message', () => {
        validationResult.errors = [ErrorType.Duration];
        validationResult.duration = 3700;
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(1);
        expect(errorMessages).toContain(`Expected total duration to be less than 5 minutes, got ${new Date(validationResult.duration).toISOString().substr(11, 12)}`);
      });

      it('should output memory error message', () => {
        validationResult.errors = [ErrorType.Memory];
        validationResult.memoryUsage = 3700/3500;
        validationResult.commandCount = 3700;
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(1);
        expect(errorMessages).toContain(`Used ${parseFloat((validationResult.memoryUsage * 100).toFixed(2))}% of available memory! Sequence uses ${validationResult.commandCount} commands, but the maximum allowed is 3500!`);
      });

      it('should output duration and memory error message', () => {
        validationResult.errors = [ErrorType.Duration, ErrorType.Memory];
        validationResult.duration = 3900;
        validationResult.memoryUsage = 1.39;
        validationResult.commandCount = 1.39 * 3500;
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(2);
        expect(errorMessages).toContain(`Expected total duration to be less than 5 minutes, got ${new Date(validationResult.duration).toISOString().substr(11, 12)}`);
        expect(errorMessages).toContain(`Used ${parseFloat((validationResult.memoryUsage * 100).toFixed(2))}% of available memory! Sequence uses ${validationResult.commandCount} commands, but the maximum allowed is 3500!`);
      });
    });
  });
});
