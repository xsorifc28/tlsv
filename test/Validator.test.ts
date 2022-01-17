import type { ValidationResults } from "../src/Validator";
import { Validator, ErrorType, buildErrorMessages } from '../src/index'
import * as fs from 'fs';
import * as path from 'path';

function readFile(filePath: string): Buffer {
  return fs.readFileSync(path.join(__dirname, filePath));
}

function convertBufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

describe('Validator', () => {
  describe('Valid', () => {
    it('should execute validation (valid)', () => {
      const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(readFile('sampleFiles/lightshow_valid.fseq')));
      expect(Object.keys(validationResult).length).toBe(7);
      expect(validationResult.frameCount).toBe(2247);
      expect(validationResult.stepTime).toBe(20);
      expect(validationResult.duration).toBe(44940);
      expect(validationResult.memoryUsage).toBeGreaterThan(0.16);
      expect(validationResult.memoryUsage).toBeLessThan(0.17);
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
        memoryUsage: 0.30983847283406757,
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
          memoryUsage: 0.1644640234948605,
          stepTime: 255,
          channelCount: 48,
        });
      });
    });

    describe('Memory and Duration', () => {
      it('should execute validation (memory > 100%)', () => {
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(readFile('sampleFiles/lightshow_mem_111.fseq')));
        expect(Object.keys(validationResult).length).toBe(7);
        expect(validationResult.frameCount).toBe(4310);
        expect(validationResult.stepTime).toBe(20);
        expect(validationResult.duration).toBe(86200);
        expect(validationResult.memoryUsage).toBeGreaterThan(1.11);
        expect(validationResult.memoryUsage).toBeLessThan(1.12);
        expect(validationResult.commandCount).toBe(756);
        expect(validationResult.channelCount).toBe(48);
        expect(validationResult.errors.length).toBe(1);
        expect(validationResult.errors).toContain(ErrorType.Memory);
      });

      it('should execute validation (memory > 100%) #2', () => {
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(readFile('sampleFiles/lightshow_mem_174.fseq')));
        expect(Object.keys(validationResult).length).toBe(7);
        expect(validationResult.frameCount).toBe(3093);
        expect(validationResult.stepTime).toBe(50);
        expect(validationResult.duration).toBe(154650);
        expect(validationResult.memoryUsage).toBeGreaterThan(1);
        expect(validationResult.memoryUsage).toBeLessThan(1.7420);
        expect(validationResult.commandCount).toBe(1186);
        expect(validationResult.channelCount).toBe(48);
        expect(validationResult.errors.length).toBe(1);
        expect(validationResult.errors).toContain(ErrorType.Memory);
      });

      it('should execute validation (memory > 100%, duration > 5m)', () => {
        const buffer = readFile('sampleFiles/lightshow_mem_174.fseq');
        buffer[18] = 255;
        const validationResult: ValidationResults = Validator(convertBufferToArrayBuffer(buffer));
        expect(Object.keys(validationResult).length).toBe(7);
        expect(validationResult.frameCount).toBe(3093);
        expect(validationResult.stepTime).toBe(255);
        expect(validationResult.duration).toBe(788715);
        expect(validationResult.memoryUsage).toBeGreaterThan(1.7410);
        expect(validationResult.memoryUsage).toBeLessThan(1.7420);
        expect(validationResult.commandCount).toBe(1186);
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
        validationResult.memoryUsage = 1.12;
        validationResult.commandCount = 1186;
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(1);
        expect(errorMessages).toContain(`Used ${parseFloat((validationResult.memoryUsage * 100).toFixed(2))}% of available memory! Sequence uses ${validationResult.commandCount} commands, but the maximum allowed is 681!`);
      });

      it('should output duration and memory error message', () => {
        validationResult.errors = [ErrorType.Duration, ErrorType.Memory];
        validationResult.duration = 3900;
        validationResult.memoryUsage = 1.39;
        validationResult.commandCount = 1586;
        const errorMessages = buildErrorMessages(validationResult);
        expect(errorMessages.length).toBe(2);
        expect(errorMessages).toContain(`Expected total duration to be less than 5 minutes, got ${new Date(validationResult.duration).toISOString().substr(11, 12)}`);
        expect(errorMessages).toContain(`Used ${parseFloat((validationResult.memoryUsage * 100).toFixed(2))}% of available memory! Sequence uses ${validationResult.commandCount} commands, but the maximum allowed is 681!`);
      });
    });
  });
});
