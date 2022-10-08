import ytdl from "ytdl-core";
import chalk from 'chalk';
import fs from 'node:fs';
import ps from 'prompt-sync';
import progress from 'progress-stream';

const prompt = ps({ sigint: true });
const convertFilename = (filename:string, replacement:string = '_') => (filename.replace(/[ &\/\\#,+()$~%.'":*?<>{}]/g, replacement)); 

async function download(url:string, file_type:'flv'|'3gp'|'mp4'|'webm'= 'mp4') {

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, {
        filter: i => i.container === file_type && i.hasVideo === true && i.hasAudio == true,
        quality: 'highestvideo',
    })

    const filename = convertFilename(info.videoDetails.title) + '.' + format.container;

    console.log(
        `${chalk.blue("[i] Title          :")} ${chalk.yellow(info.videoDetails.title)}\n` +
        `${chalk.blue("[i] Uploader       :")} ${chalk.yellow(info.videoDetails.author.name)}\n` +
        `${chalk.blue("[i] Length         :")} ${chalk.yellow(formatSeconds(info.videoDetails.lengthSeconds))}\n` +
        `${chalk.blue("[i] File Type      :")} ${chalk.yellow(format.container)}\n` +
        `${chalk.blue("[i] Quality        :")} ${chalk.yellow(format.qualityLabel)}`
    )

    console.log(chalk.blue("[i] Downloading..."));
    const startTime = performance.now();
    const stream = ytdl(url, {
        format: format
    })
    .on('progress', (_, downloaded, total) => {
        process.stdout.write(chalk.blue(`[i] `) + chalk.green(`${((downloaded / total) * 100).toFixed(1)}% `) + chalk.blue(`Time elapsed: `) + chalk.yellow(`${((performance.now() - startTime) / 1000).toFixed(3)} seconds ` + chalk.blue(` Downloaded: `) + chalk.yellow(`${formatBytes(downloaded, 1, true)}/${formatBytes(total, 1, true)}   `))  +'\r');
    })   
    .pipe(
        fs.createWriteStream(filename)
        .once('finish', () => {
            const endTime = performance.now();
            console.log(
                `${chalk.blue(`[i] Download finished in `)}${chalk.yellow(`${((endTime - startTime) / 1000).toFixed(3)} seconds`)}\n` +
                `${chalk.blue(`[i] File saved as `)}${chalk.yellow(filename)}`
            );
        })
    );


};

function formatBytes(bytes:number, decimals:number = 2, show_size:boolean = true) {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))}${show_size ? `${sizes[i]}` : ''}`
}

function formatSeconds(seconds:number|string) {
    if (typeof seconds === "string") seconds = Number(seconds); // Convert to number if {seconds} string
    console.log(seconds);
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
        askFormat(url);
    }
}

function askFormat(url:string){
    const format = prompt(chalk.blue("[>] File type (flv/3gp/mp4/webm): "));
    if (format !== 'flv' && format !== '3gp' && format !== 'mp4' && format !== 'webm') {
        console.log(chalk.red(`[!] Invalid format.\nInput: ${format}`));
        askFormat(url);
    } else {
        download(url, format);
    }
}

askURL();