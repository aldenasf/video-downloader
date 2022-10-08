import readline from 'node:readline';
import cp from 'node:child_process';
import ytdl from "ytdl-core";
import ffmpeg from 'ffmpeg-static';
import chalk from 'chalk';
import ps from 'prompt-sync';
import internal from 'node:stream'; 

const prompt = ps();
const convertFilename = (filename:string, replacement:string = '_') => (filename.replace(/[ &\/\\#,+()$~%.'":*?<>{}]/g, replacement)); 

async function download(url:string) {
    const tracker = {
        start: performance.now(),
        audio: { downloaded: 0, total: 100 },
        video: { downloaded: 0, total: 100 },
        merged: { frame: 0, speed: '0x', fps: 0 }
    };
    const metadata = await ytdl.getBasicInfo(url, {});
    const quality  = { video: undefined, audio: undefined }
    const filename = convertFilename(metadata.videoDetails.title) + '.mkv';

    const video = ytdl(url, { quality: 'highestvideo' })
        .on('info', (_, format) => {
            console.log(`${chalk.blue("[i] Video Quality  :")} ${chalk.yellow(format.qualityLabel)}`)
        })
        .on('progress', (_, downloaded, total) => {
            tracker.video = { downloaded, total };
        });

    const audio = ytdl(url, { quality: 'highestaudio' })
        .on('info', (_, format) => {
            quality.audio = format.audioQuality;
            console.log(`${chalk.blue("[i] Video Quality  :")} ${chalk.yellow(format.audioQuality)}`)
        })
        .on('progress', (_, downloaded, total) => {
            tracker.audio = { downloaded, total };
        });

    console.log(
        `${chalk.blue("[i] Title          :")} ${chalk.yellow(metadata.videoDetails.title)}\n` +
        `${chalk.blue("[i] Uploader       :")} ${chalk.yellow(metadata.videoDetails.author.name)}\n` +
        `${chalk.blue("[i] Length         :")} ${chalk.yellow(formatSeconds(metadata.videoDetails.lengthSeconds))}`
    )

    let progressbarHandle:any = null;
    const progressBarInterval = 0;
    const showProgress = () => {
        readline.cursorTo(process.stdout, 0);
        process.stdout.write('\n')
        process.stdout.write(chalk.red(`[i] Audio  | ${(tracker.audio.downloaded / tracker.audio.total * 100).toFixed(2)}% downloaded `));
        process.stdout.write(chalk.red(`(${formatBytes(tracker.audio.downloaded, 1, true)}/${formatBytes(tracker.audio.total, 1, true)}).${' '.repeat(10)}\n`));
        process.stdout.write(chalk.cyan(`[i] Video  | ${(tracker.video.downloaded / tracker.video.total * 100).toFixed(2)}% downloaded `));
        process.stdout.write(chalk.cyan(`(${formatBytes(tracker.video.downloaded, 1, true)}/${formatBytes(tracker.video.total,1 ,true)}).${' '.repeat(10)}\n`));
        process.stdout.write(chalk.yellow(`[i] Merged | processing frame ${tracker.merged.frame} `));
        process.stdout.write(chalk.yellow(`(at ${tracker.merged.fps} fps => ${tracker.merged.speed}).${' '.repeat(10)}\n`));
        process.stdout.write(chalk.blue(`[i] Time elapsed ${((performance.now() - tracker.start) / 1000).toFixed(3)} seconds.\n`));
        readline.moveCursor(process.stdout, 0, -5);
    };

    console.log(chalk.blue(`[i] Downloading...`));
    const ffmpegProcess = cp.spawn(ffmpeg ? ffmpeg : '', [
        '-loglevel', '8', '-hide_banner',
        '-progress', 'pipe:3',
        '-i', 'pipe:4',
        '-i', 'pipe:5',
        '-map', '0:a',
        '-map', '1:v',
        '-c:v', 'copy',
        filename,
    ], {
        windowsHide: true,
        stdio: [
            'inherit', 'inherit', 'inherit',
            'pipe', 'pipe', 'pipe'
        ]
    })

    ffmpegProcess.on('close', () => {
        clearInterval(progressbarHandle);
    })

    ffmpegProcess.stdio[3]?.on('data', (chunk) => {
        if (!progressbarHandle) progressbarHandle = setInterval(showProgress, progressBarInterval);

        const lines = chunk.toString().trim().split('\n');
        const args:any = {};
        for (const line of lines) {
            const [key, value] = line.split('=');
            args[key.trim()] = value.trim();
        }
        tracker.merged = args;
    })

    if (ffmpegProcess.stdio[4]) audio.pipe((ffmpegProcess.stdio[4] as internal.Writable));
    if (ffmpegProcess.stdio[(4+1)]) video.pipe((ffmpegProcess.stdio[(4+1)] as internal.Writable));

    ffmpegProcess.on('close', () => {
        process.stdout.write('\n\n\n');
        clearInterval(progressbarHandle);
        const endTime = performance.now();
        console.log(
            `${chalk.blue(`[i] Download finished in `)}${chalk.yellow(`${((endTime - tracker.start) / 1000).toFixed(3)} seconds`)}          \n` +
            `${chalk.blue(`[i] File saved as `)}${chalk.yellow(filename)}`
        );
    })
}

function formatBytes(bytes:number, decimals:number = 2, show_size:boolean = true) {
    if (!+bytes) return '0B'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${show_size ? `${sizes[i]}` : ''}`
}

function formatSeconds(seconds:number|string) {
    if (typeof seconds === "string") seconds = Number(seconds); // Convert to number if {seconds} string
    // console.log(seconds);
    if (seconds < 3600) {
        return (new Date(seconds * 1000).toISOString().substring(14, 19)).toString()
    } else {
        return (new Date(seconds * 1000).toISOString().substring(11, 16)).toString()
    }
}

function askURL(){ // 1st step
    const url = prompt(chalk.blue("[>] Video URL: "));
    if (!url || !ytdl.validateURL(url)) {
        console.log(`[!] Invalid video URL.\nInput: ${url}`);
        askURL()
    } else {
        download(url);
    }
}

askURL();