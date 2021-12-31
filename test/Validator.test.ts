import type { ValidationResults } from "../src/Validator";
import { Validator } from '../src/index'
import * as fs from 'fs';
import * as path from 'path';

function readFile(filePath: string) {
  return fs.readFileSync(path.join(__dirname, filePath));
}

function readFileAsBuffer(filePath: string) {
  return readFile(filePath).buffer;
}

describe('Validator', () => {
  describe('Valid', () => {
    it('should execute validation (valid)', () => {
      const validationResult: ValidationResults = Validator(readFileAsBuffer('sampleFiles/lightshow_valid.fseq'));
      expect(Object.keys(validationResult).length).toBe(6);
      expect(validationResult.frameCount).toBe(2247);
      expect(validationResult.stepTime).toBe(20);
      expect(validationResult.durationSecs).toBe(44.94);
      expect(validationResult.memoryUsage).toBeGreaterThan(0.16);
      expect(validationResult.memoryUsage).toBeLessThan(0.17);
      expect(validationResult.commandCount).toBe(112);
      expect(validationResult.error).toBeUndefined();
    });
  });

  describe('Invalid', () => {
    describe('Bad Input', () => {
      it('should return error (no data)', () => {
        // @ts-ignore
        const validationResult: ValidationResults = Validator();
        expect(validationResult.error).toBe('Error - file is corrupt or has no data');
        expect(Object.keys(validationResult).length).toBe(1);
      });

      it('should return error (unknown \'magic\' format)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[0] = 79;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(validationResult.error).toBe('Unknown file format, expected FSEQ v2.0');
        expect(Object.keys(validationResult).length).toBe(1);
      });

      it('should return error (not 48 channels)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[11] = 79;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(validationResult.error).toBe('Expected 48 channels, got 20272');
        expect(Object.keys(validationResult).length).toBe(1);
      });

      it('should return error (compressionType=1)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[20] = 3;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(validationResult.error).toBe('Expected file format to be V2 Uncompressed');
        expect(Object.keys(validationResult).length).toBe(1);
      });

      it('should return error (duration > 5m)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[18] = 255;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(validationResult.error).toBe('Expected total duration to be less than 5 minutes, got 00:09:32.985');
        expect(Object.keys(validationResult).length).toBe(6);
        expect(validationResult.frameCount).toBe(2247);
        expect(validationResult.stepTime).toBe(255);
        expect(validationResult.durationSecs).toBe(572.985);
        expect(validationResult.memoryUsage).toBeGreaterThan(0.16);
        expect(validationResult.memoryUsage).toBeLessThan(0.17);
        expect(validationResult.commandCount).toBe(112);
      });
    });

    describe('Memory', () => {
      it('should execute validation (memory > 100%)', () => {
        const validationResult: ValidationResults = Validator(readFileAsBuffer('sampleFiles/lightshow_mem_111.fseq'));
        expect(Object.keys(validationResult).length).toBe(6);
        expect(validationResult.frameCount).toBe(4310);
        expect(validationResult.stepTime).toBe(20);
        expect(validationResult.durationSecs).toBe(86.2);
        expect(validationResult.memoryUsage).toBeGreaterThan(1.11);
        expect(validationResult.memoryUsage).toBeLessThan(1.12);
        expect(validationResult.commandCount).toBe(756);
        expect(validationResult.error).toBe('Used 111.01% of available memory! Sequence uses 756 commands, but the maximum allowed is 681!')
      });

      it('should execute validation (memory > 100%) #2', () => {
        const validationResult: ValidationResults = Validator(readFileAsBuffer('sampleFiles/lightshow_mem_174.fseq'));
        expect(Object.keys(validationResult).length).toBe(6);
        expect(validationResult.frameCount).toBe(3093);
        expect(validationResult.stepTime).toBe(50);
        expect(validationResult.durationSecs).toBe(154.65);
        expect(validationResult.memoryUsage).toBeGreaterThan(1);
        expect(validationResult.memoryUsage).toBeLessThan(1.7420);
        expect(validationResult.commandCount).toBe(1186);
        expect(validationResult.error).toBe('Used 174.16% of available memory! Sequence uses 1186 commands, but the maximum allowed is 681!')
      });
    });
  });
});
