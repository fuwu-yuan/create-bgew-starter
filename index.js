#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import process from 'process';
import fetch from 'node-fetch';
import unzipper from 'unzipper';

const args = process.argv.slice(2);
const templateArgIndex = args.findIndex(arg => arg.startsWith('--template='));
const requestedTemplate = templateArgIndex !== -1 ? args[templateArgIndex].split('=')[1] : null;
const fallbackTemplate = 'empty-starter';
const targetDir = args.find(arg => !arg.startsWith('--')) || (requestedTemplate || fallbackTemplate);

const repoZipUrl = 'https://github.com/fuwu-yuan/bgew/archive/refs/heads/main.zip';

async function main() {
    const tmpZipPath = path.join(os.tmpdir(), 'bgew-main.zip');
    const tmpExtractDir = path.join(os.tmpdir(), 'bgew-main');

    console.log(`📦 Downloading templates from GitHub...`);

    // Télécharger l'archive
    const res = await fetch(repoZipUrl);
    const fileStream = fs.createWriteStream(tmpZipPath);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on('error', reject);
        fileStream.on('finish', resolve);
    });

    // Extraire tout dans tmpExtractDir
    console.log('📂 Extracting archive...');
    await fs.ensureDir(tmpExtractDir);
    await fs.createReadStream(tmpZipPath)
        .pipe(unzipper.Extract({ path: tmpExtractDir }))
        .promise();

    // Fonction utilitaire pour copier template
    async function copyTemplate(templateName) {
        console.log(`📝 Copying template ${templateName} to ${targetDir}`);
        const sourceDir = path.join(tmpExtractDir, `bgew-main/examples/${templateName}`);
        const finalTargetDir = path.resolve(process.cwd(), targetDir);

        if (!await fs.pathExists(sourceDir)) {
            return false;
        }

        await fs.copy(sourceDir, finalTargetDir);
        return true;
    }

    // Essayer template demandé ou fallback
    if (requestedTemplate) {
        const ok = await copyTemplate(requestedTemplate);
        if (!ok) {
            console.warn(`⚠️ Template "${requestedTemplate}" not found. Falling back to "${fallbackTemplate}".`);
            const fallbackOk = await copyTemplate(fallbackTemplate);
            if (!fallbackOk) {
                throw new Error(`❌ Neither requested template "${requestedTemplate}" nor fallback "${fallbackTemplate}" found in repository.`);
            }
        }
    } else {
        // Pas de template demandé, prendre fallback direct
        const fallbackOk = await copyTemplate(fallbackTemplate);
        if (!fallbackOk) {
            throw new Error(`❌ Fallback template "${fallbackTemplate}" not found in repository.`);
        }
    }

    console.log(`✅ Template copied to "${targetDir}"`);
    console.log('👉 Now run:');
    console.log(`cd ${targetDir}`);
    console.log('npm install');
    console.log('npm start');
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
