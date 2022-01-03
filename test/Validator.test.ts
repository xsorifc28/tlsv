import type { ValidationResults } from "../src/Validator";
import { ErrorType } from "../src/Validator";
import { Validator } from '../src/index'
import * as fs from 'fs';
import * as path from 'path';

function readFile(filePath: string): Buffer {
  return fs.readFileSync(path.join(__dirname, filePath));
}

function convertBufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  const fileBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return fileBuffer;
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
      expect(validationResult.errors.length).toBe(0)
    });
  });

  describe('Invalid', () => {
    describe('Bad Input', () => {
      it('should return error (no data)', () => {
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
        expect(validationResult.errors.length).toBe(1)
        expect(validationResult.errors).toContain(ErrorType.Memory)
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
        expect(validationResult.errors.length).toBe(1)
        expect(validationResult.errors).toContain(ErrorType.Memory)
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
        expect(validationResult.channelCount).toBe(48)
        expect(validationResult.errors.length).toBe(2);
        expect(validationResult.errors).toContain(ErrorType.Duration);
        expect(validationResult.errors).toContain(ErrorType.Memory);
      });
    });
  });
});
