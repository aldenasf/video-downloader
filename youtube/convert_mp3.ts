import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import ytdl from 'ytdl-core';
import chalk from 'chalk';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ps from 'prompt-sync';

ffmpeg.setFfmpegPath(ffmpegPath.path);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prompt = ps();
const convertFilename = (filename:string, replacement:string = '_') => (filename.replace(/[ &\/\\#,+()$~%.'":*?<>{}]/g, replacement)); 

async function download(url:string, bitrate:number = 128) {
    const metadata = await ytdl.getBasicInfo(url);
    console.log(
        `${chalk.blue("[i] Title          :")} ${chalk.yellow(metadata.videoDetails.title)}\n` +
        `${chalk.blue("[i] Uploader       :")} ${chalk.yellow(metadata.videoDetails.author.name)}\n` +
        `${chalk.blue("[i] Length         :")} ${chalk.yellow(formatSeconds(metadata.videoDetails.lengthSeconds))}\n`
    )

    console.log(chalk.blue(`[i] Downloading...`))

    const startTime = performance.now();
    const stream = ytdl(url, {
        quality: 'highestaudio'
    })
    .on('progress', (_, downloaded, total) => {
        process.stdout.write(chalk.blue(`[i] `) + chalk.green(`${((downloaded / total) * 100).toFixed(1)}% `) + chalk.blue(`Time elapsed: `) + chalk.yellow(`${((performance.now() - startTime) / 1000).toFixed(3)} seconds ` + chalk.blue(`Downloaded: `) + chalk.yellow(`${formatBytes(downloaded, 1, true)}/${formatBytes(total, 1, true)}   `))  +'\r');
    });


    ffmpeg(stream)
        .audioBitrate(bitrate)
        .save(`${__dirname}/${convertFilename(metadata.videoDetails.title)}.mp3`)
        .on('end', () => {
            const endTime = performance.now();
            console.log(
                `${chalk.blue(`[i] Download finished in `)}${chalk.yellow(`${((endTime - startTime) / 1000).toFixed(3)} seconds`)}\n` +
                `${chalk.blue(`[i] File saved as `)}${chalk.yellow(`${convertFilename(metadata.videoDetails.title)}.mp3`)}`
            );
        });
}

function formatBytes(bytes:number, decimals:number = 2, show_size:boolean = true) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${show_size ? `${sizes[i]}` : ''}`
}

function formatSeconds(seconds:number|string) {
    if (typeof seconds === "string") seconds = Number(seconds);
    if (seconds < 3600) {
        return (new Date(seconds * 1000).toISOString().substring(14, 19)).toString()
    } else {
        return (new Date(seconds * 1000).toISOString().substring(11, 16)).toString()
    }
}

function askURL(){
    const url = prompt(chalk.blue("[>] Video URL: "));
    if (!ytdl.validateURL(url)) {
        console.log(`[!] Invalid video URL.\nInput: ${url}`);
        askURL()
    } else {
        askBitrate(url);
    }
}

function askBitrate(url:string){
    const bitrate = prompt(chalk.blue("[>] Audio Bitrate (default 128): "));
    if (!bitrate) {
        download(url, Number(bitrate))
    } else if (isNaN(Number(bitrate))) {
        console.log(`[!] Bitrate is not a number.\nInput: ${url}`);
        askBitrate(url)
    } else if (Number(bitrate) <= 0) {
        console.log(`[!] Bitrate cannot be less than 0.\nInput: ${url}`);
        askBitrate(url)
    } else {
        download(url, Number(bitrate))
    }
}

askURL()