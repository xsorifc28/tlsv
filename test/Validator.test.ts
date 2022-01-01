import type { ValidationResults } from "../src/Validator";
import { ValidationPart } from "../src/Validator";
import { Validator } from '../src/index'
import * as fs from 'fs';
import * as path from 'path';

function readFile(filePath: string) {
  return fs.readFileSync(path.join(__dirname, filePath));
}

function readFileAsBuffer(filePath: string) {
  const file = readFile(filePath);
  const fileBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  return fileBuffer;
}

describe('Validator', () => {
  describe('Valid', () => {
    it('should execute validation (valid)', () => {
      const validationResult: ValidationResults = Validator(readFileAsBuffer('sampleFiles/lightshow_valid.fseq'));
      expect(Object.keys(validationResult).length).toBe(6);
      expect(validationResult.frameCount).toBe(2247);
      expect(validationResult.stepTime).toBe(20);
      expect(validationResult.duration).toBe(44940);
      expect(validationResult.memoryUsage).toBeGreaterThan(0.16);
      expect(validationResult.memoryUsage).toBeLessThan(0.17);
      expect(validationResult.commandCount).toBe(112);
      for (const key in validationResult.results) {
        expect(validationResult.results[key].isValid).toBe(true)
      }
    });
  });

  describe('Invalid', () => {
    describe('Bad Input', () => {
      it('should return error (no data)', () => {
        // @ts-ignore
        const validationResult: ValidationResults = Validator();
        expect(validationResult.commandCount).toEqual(0);
        expect(validationResult.duration).toEqual(0);
        expect(validationResult.frameCount).toEqual(0);
        expect(validationResult.memoryUsage).toEqual(0);
        expect(validationResult.stepTime).toEqual(0);

        const resultsKey = ValidationPart.InputData
        expect(Object.keys(validationResult.results)).toContain(resultsKey.toString())
        expect(validationResult.results[resultsKey].isValid).toBe(false);
        expect(validationResult.results[resultsKey].message).toBe('An input type of ArrayBuffer or ArrayBufferLike must be provided!');
      });

      it('should return error (unknown \'magic\' format)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[0] = 79;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(validationResult.commandCount).toEqual(0);
        expect(validationResult.duration).toEqual(0);
        expect(validationResult.frameCount).toEqual(2247);
        expect(validationResult.memoryUsage).toEqual(0);
        expect(validationResult.stepTime).toEqual(20);

        const resultsKey = ValidationPart.FileFormat
        expect(Object.keys(validationResult.results)).toContain(resultsKey.toString())
        expect(validationResult.results[resultsKey].isValid).toBe(false);
        expect(validationResult.results[resultsKey].message).toBe('Unknown file format, expected FSEQ v2.0');
      });

      it('should return error (not 48 channels)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[11] = 79;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(validationResult.commandCount).toEqual(0);
        expect(validationResult.duration).toEqual(0);
        expect(validationResult.frameCount).toEqual(2247);
        expect(validationResult.memoryUsage).toEqual(0);
        expect(validationResult.stepTime).toEqual(20);

        const resultsKey = ValidationPart.ChannelCount
        expect(Object.keys(validationResult.results)).toContain(resultsKey.toString())
        expect(validationResult.results[resultsKey].isValid).toBe(false);
        expect(validationResult.results[resultsKey].message).toBe('Expected 48 channels, got 20272');
      });

      it('should return error (compressionType=1)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[20] = 3;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(validationResult.commandCount).toEqual(0);
        expect(validationResult.duration).toEqual(0);
        expect(validationResult.frameCount).toEqual(2247);
        expect(validationResult.memoryUsage).toEqual(0);
        expect(validationResult.stepTime).toEqual(20);

        const resultsKey = ValidationPart.FseqType
        expect(Object.keys(validationResult.results)).toContain(resultsKey.toString())
        expect(validationResult.results[resultsKey].isValid).toBe(false);
        expect(validationResult.results[resultsKey].message).toBe('Expected file format to be V2 Uncompressed');
      });

      it('should return error (duration > 5m)', () => {
        const buffer = readFile('sampleFiles/lightshow_valid.fseq');
        buffer[18] = 255;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(validationResult.commandCount).toEqual(112);
        expect(validationResult.duration).toEqual(572985);
        expect(validationResult.frameCount).toEqual(2247);
        expect(validationResult.memoryUsage).toEqual(0.1644640234948605);
        expect(validationResult.stepTime).toEqual(255);

        const resultsKey = ValidationPart.Duration
        expect(Object.keys(validationResult.results)).toContain(resultsKey.toString())
        expect(validationResult.results[resultsKey].isValid).toBe(false);
        expect(validationResult.results[resultsKey].message).toBe('Expected total duration to be less than 5 minutes, got 00:09:32.985');
      });
    });

    describe('Memory and Duration', () => {
      it('should execute validation (memory > 100%)', () => {
        const validationResult: ValidationResults = Validator(readFileAsBuffer('sampleFiles/lightshow_mem_111.fseq'));
        expect(Object.keys(validationResult).length).toBe(6);
        expect(validationResult.frameCount).toBe(4310);
        expect(validationResult.stepTime).toBe(20);
        expect(validationResult.duration).toBe(86200);
        expect(validationResult.memoryUsage).toBeGreaterThan(1.11);
        expect(validationResult.memoryUsage).toBeLessThan(1.12);
        expect(validationResult.commandCount).toBe(756);

        const resultsKey = ValidationPart.Memory
        expect(Object.keys(validationResult.results)).toContain(resultsKey.toString())
        expect(validationResult.results[resultsKey].isValid).toBe(false);
        expect(validationResult.results[resultsKey].message).toBe('Used 111.01% of available memory! Sequence uses 756 commands, but the maximum allowed is 681!');
      });

      it('should execute validation (memory > 100%) #2', () => {
        const validationResult: ValidationResults = Validator(readFileAsBuffer('sampleFiles/lightshow_mem_174.fseq'));
        expect(Object.keys(validationResult).length).toBe(6);
        expect(validationResult.frameCount).toBe(3093);
        expect(validationResult.stepTime).toBe(50);
        expect(validationResult.duration).toBe(154650);
        expect(validationResult.memoryUsage).toBeGreaterThan(1);
        expect(validationResult.memoryUsage).toBeLessThan(1.7420);
        expect(validationResult.commandCount).toBe(1186);

        const resultsKey = ValidationPart.Memory
        expect(Object.keys(validationResult.results)).toContain(resultsKey.toString())
        expect(validationResult.results[resultsKey].isValid).toBe(false);
        expect(validationResult.results[resultsKey].message).toBe('Used 174.16% of available memory! Sequence uses 1186 commands, but the maximum allowed is 681!');
      });

      it('should execute validation (memory > 100%, duration > 5m)', () => {
        const buffer = readFile('sampleFiles/lightshow_mem_174.fseq');
        buffer[18] = 255;
        const validationResult: ValidationResults = Validator(buffer.buffer);
        expect(Object.keys(validationResult).length).toBe(6);
        expect(validationResult.frameCount).toBe(3093);
        expect(validationResult.stepTime).toBe(255);
        expect(validationResult.duration).toBe(788715);
        expect(validationResult.memoryUsage).toBeGreaterThan(1.7410);
        expect(validationResult.memoryUsage).toBeLessThan(1.7420);
        expect(validationResult.commandCount).toBe(1186);

        const firstResultsKey = ValidationPart.Memory
        expect(Object.keys(validationResult.results)).toContain(firstResultsKey.toString())
        expect(validationResult.results[firstResultsKey].isValid).toBe(false);
        expect(validationResult.results[firstResultsKey].message).toBe('Used 174.16% of available memory! Sequence uses 1186 commands, but the maximum allowed is 681!');

        const secondResultsKey = ValidationPart.Duration
        expect(Object.keys(validationResult.results)).toContain(secondResultsKey.toString())
        expect(validationResult.results[secondResultsKey].isValid).toBe(false);
        expect(validationResult.results[secondResultsKey].message).toBe('Expected total duration to be less than 5 minutes, got 00:13:08.715');
      });
    });
  });
});
