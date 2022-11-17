"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const os_1 = __importDefault(require("os"));
const path_1 = require("path");
const stream_1 = require("stream");
const fluent_ffmpeg_1 = __importStar(require("fluent-ffmpeg"));
const pageVideoStreamTypes_1 = require("./pageVideoStreamTypes");
/**
 * @ignore
 */
const SUPPORTED_FILE_FORMATS = [
    pageVideoStreamTypes_1.SupportedFileFormats.MP4,
    pageVideoStreamTypes_1.SupportedFileFormats.AVI,
    pageVideoStreamTypes_1.SupportedFileFormats.MOV,
    pageVideoStreamTypes_1.SupportedFileFormats.WEBM,
];
/**
 * @ignore
 */
class PageVideoStreamWriter extends events_1.EventEmitter {
    constructor(destinationSource, options) {
        super();
        this.screenLimit = 40;
        this.screenCastFrames = [];
        this.duration = '00:00:00:00';
        this.status = pageVideoStreamTypes_1.VIDEO_WRITE_STATUS.NOT_STARTED;
        this.videoMediatorStream = new stream_1.PassThrough();
        if (options) {
            this.options = options;
            if (options.screenLimit) {
                this.screenLimit = options.screenLimit;
            }
        }
        const isWritable = this.isWritableStream(destinationSource);
        this.configureFFmPegPath();
        if (isWritable) {
            this.configureVideoWritableStream(destinationSource);
        }
        else {
            this.configureVideoFile(destinationSource);
        }
    }
    get videoFrameSize() {
        const { width, height } = this.options.videoFrame;
        return width !== null && height !== null ? `${width}x${height}` : '100%';
    }
    get autopad() {
        const autopad = this.options.autopad;
        return !autopad
            ? { activation: false }
            : { activation: true, color: autopad.color };
    }
    getFfmpegPath() {
        if (this.options.ffmpeg_Path) {
            return this.options.ffmpeg_Path;
        }
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const ffmpeg = require('@ffmpeg-installer/ffmpeg');
            if (ffmpeg.path) {
                return ffmpeg.path;
            }
            return null;
        }
        catch (e) {
            return null;
        }
    }
    getDestinationPathExtension(destinationFile) {
        const fileExtension = path_1.extname(destinationFile);
        return fileExtension.includes('.')
            ? fileExtension.replace('.', '')
            : fileExtension;
    }
    configureFFmPegPath() {
        const ffmpegPath = this.getFfmpegPath();
        if (!ffmpegPath) {
            throw new Error('FFmpeg path is missing, \n Set the FFMPEG_PATH env variable');
        }
        fluent_ffmpeg_1.setFfmpegPath(ffmpegPath);
    }
    isWritableStream(destinationSource) {
        if (destinationSource && typeof destinationSource !== 'string') {
            if (!(destinationSource instanceof stream_1.Writable) ||
                !('writable' in destinationSource) ||
                !destinationSource.writable) {
                throw new Error('Output should be a writable stream');
            }
            return true;
        }
        return false;
    }
    configureVideoFile(destinationPath) {
        const fileExt = this.getDestinationPathExtension(destinationPath);
        if (!SUPPORTED_FILE_FORMATS.includes(fileExt)) {
            throw new Error('File format is not supported');
        }
        this.writerPromise = new Promise((resolve) => {
            const outputStream = this.getDestinationStream();
            outputStream
                .on('error', (e) => {
                this.handleWriteStreamError(e.message);
                resolve(false);
            })
                .on('end', () => resolve(true))
                .save(destinationPath);
            if (fileExt == pageVideoStreamTypes_1.SupportedFileFormats.WEBM) {
                outputStream
                    .videoCodec('libvpx')
                    .videoBitrate(this.options.videoBitrate || 1000, true)
                    .outputOptions('-flags', '+global_header', '-psnr');
            }
        });
    }
    configureVideoWritableStream(writableStream) {
        this.writerPromise = new Promise((resolve) => {
            const outputStream = this.getDestinationStream();
            outputStream
                .on('error', (e) => {
                writableStream.emit('error', e);
                resolve(false);
            })
                .on('end', () => {
                writableStream.end();
                resolve(true);
            });
            outputStream.toFormat('mp4');
            outputStream.addOutputOptions('-movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov');
            outputStream.pipe(writableStream);
        });
    }
    getDestinationStream() {
        var _a, _b;
        const cpu = Math.max(1, os_1.default.cpus().length - 1);
        const outputStream = fluent_ffmpeg_1.default({
            source: this.videoMediatorStream,
            priority: 20,
        })
            .videoCodec(this.options.videoCodec || 'libx264')
            .size(this.videoFrameSize)
            .aspect(this.options.aspectRatio || '4:3')
            .autopad(this.autopad.activation, (_a = this.autopad) === null || _a === void 0 ? void 0 : _a.color)
            .inputFormat('image2pipe')
            .inputFPS(this.options.fps)
            .outputOptions(`-crf ${(_b = this.options.videoCrf) !== null && _b !== void 0 ? _b : 23}`)
            .outputOptions(`-preset ${this.options.videoPreset || 'ultrafast'}`)
            .outputOptions(`-pix_fmt ${this.options.videoPixelFormat || 'yuv420p'}`)
            .outputOptions(`-minrate ${this.options.videoBitrate || 1000}`)
            .outputOptions(`-maxrate ${this.options.videoBitrate || 1000}`)
            .outputOptions('-framerate 1')
            .outputOptions(`-threads ${cpu}`)
            .on('progress', (progressDetails) => {
            this.duration = progressDetails.timemark;
        });
        if (this.options.recordDurationLimit) {
            outputStream.duration(this.options.recordDurationLimit);
        }
        return outputStream;
    }
    handleWriteStreamError(errorMessage) {
        this.emit('videoStreamWriterError', errorMessage);
        if (this.status !== pageVideoStreamTypes_1.VIDEO_WRITE_STATUS.IN_PROGRESS &&
            errorMessage.includes('pipe:0: End of file')) {
            return;
        }
        return console.error(`Error unable to capture video stream: ${errorMessage}`);
    }
    findSlot(timestamp) {
        if (this.screenCastFrames.length === 0) {
            return 0;
        }
        let i;
        let frame;
        for (i = this.screenCastFrames.length - 1; i >= 0; i--) {
            frame = this.screenCastFrames[i];
            if (timestamp > frame.timestamp) {
                break;
            }
        }
        return i + 1;
    }
    insert(frame) {
        // reduce the queue into half when it is full
        if (this.screenCastFrames.length === this.screenLimit) {
            const numberOfFramesToSplice = Math.floor(this.screenLimit / 2);
            const framesToProcess = this.screenCastFrames.splice(0, numberOfFramesToSplice);
            this.processFrameBeforeWrite(framesToProcess);
        }
        const insertionIndex = this.findSlot(frame.timestamp);
        if (insertionIndex === this.screenCastFrames.length) {
            this.screenCastFrames.push(frame);
        }
        else {
            this.screenCastFrames.splice(insertionIndex, 0, frame);
        }
    }
    trimFrame(fameList) {
        if (!this.lastProcessedFrame) {
            this.lastProcessedFrame = fameList[0];
        }
        return fameList.map((currentFrame) => {
            const duration = currentFrame.timestamp - this.lastProcessedFrame.timestamp;
            this.lastProcessedFrame = currentFrame;
            return Object.assign(Object.assign({}, currentFrame), { duration });
        });
    }
    processFrameBeforeWrite(frames) {
        const processedFrames = this.trimFrame(frames);
        processedFrames.forEach(({ blob, duration }) => {
            this.write(blob, duration);
        });
    }
    write(data, durationSeconds = 1) {
        this.status = pageVideoStreamTypes_1.VIDEO_WRITE_STATUS.IN_PROGRESS;
        const NUMBER_OF_FPS = Math.max(Math.floor(durationSeconds * this.options.fps), 1);
        for (let i = 0; i < NUMBER_OF_FPS; i++) {
            this.videoMediatorStream.write(data);
        }
    }
    drainFrames(stoppedTime) {
        this.processFrameBeforeWrite(this.screenCastFrames);
        this.screenCastFrames = [];
        if (!this.lastProcessedFrame)
            return;
        const durationSeconds = stoppedTime - this.lastProcessedFrame.timestamp;
        this.write(this.lastProcessedFrame.blob, durationSeconds);
    }
    stop(stoppedTime = Date.now() / 1000) {
        if (this.status === pageVideoStreamTypes_1.VIDEO_WRITE_STATUS.COMPLETED) {
            return this.writerPromise;
        }
        this.drainFrames(stoppedTime);
        this.videoMediatorStream.end();
        this.status = pageVideoStreamTypes_1.VIDEO_WRITE_STATUS.COMPLETED;
        return this.writerPromise;
    }
}
exports.default = PageVideoStreamWriter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFnZVZpZGVvU3RyZWFtV3JpdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xpYi9wYWdlVmlkZW9TdHJlYW1Xcml0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsbUNBQXNDO0FBQ3RDLDRDQUFvQjtBQUNwQiwrQkFBK0I7QUFDL0IsbUNBQStDO0FBRS9DLCtEQUFzRDtBQUV0RCxpRUFLZ0M7QUFFaEM7O0dBRUc7QUFDSCxNQUFNLHNCQUFzQixHQUFHO0lBQzdCLDJDQUFvQixDQUFDLEdBQUc7SUFDeEIsMkNBQW9CLENBQUMsR0FBRztJQUN4QiwyQ0FBb0IsQ0FBQyxHQUFHO0lBQ3hCLDJDQUFvQixDQUFDLElBQUk7Q0FDMUIsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBcUIscUJBQXNCLFNBQVEscUJBQVk7SUFZN0QsWUFBWSxpQkFBb0MsRUFBRSxPQUFzQjtRQUN0RSxLQUFLLEVBQUUsQ0FBQztRQVpGLGdCQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLHFCQUFnQixHQUFHLEVBQUUsQ0FBQztRQUV2QixhQUFRLEdBQUcsYUFBYSxDQUFDO1FBRXhCLFdBQU0sR0FBRyx5Q0FBa0IsQ0FBQyxXQUFXLENBQUM7UUFHeEMsd0JBQW1CLEdBQWdCLElBQUksb0JBQVcsRUFBRSxDQUFDO1FBTTNELElBQUksT0FBTyxFQUFFO1lBQ1gsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7WUFFdkIsSUFBSSxPQUFPLENBQUMsV0FBVyxFQUFFO2dCQUN2QixJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUM7YUFDeEM7U0FDRjtRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzNCLElBQUksVUFBVSxFQUFFO1lBQ2QsSUFBSSxDQUFD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