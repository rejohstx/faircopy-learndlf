#!/usr/bin/env node

const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

const {CETEI} = require("./CETEI")
const { pageTemplate } = require("./page-template")

function dirExists( dir ) {
    if( !fs.existsSync(dir) ) {
      fs.mkdirSync(dir);
      if( !fs.existsSync(dir) ) {
        throw `ERROR: ${dir} not found and unable to create it.`;
      }
    }  
}

function convertToHTML( sourcePath ) {
    const htmlDOM = new JSDOM()
    const ceTEI = new CETEI(htmlDOM.window)

    console.log(`Converting ${sourcePath}`)
    try {
        const xml = fs.readFileSync(sourcePath, "utf8")
        const xmlDOM = new JSDOM(xml, { contentType: "text/xml" })    
        const data = ceTEI.domToHTML5(xmlDOM.window.document)
        return data.innerHTML
    } catch( err ) {
        console.error(`ERROR ${err}: ${err.stack}`)  
    }

    return null
}

function mirrorDirs(sourcePath, targetPath) {
    const dirContents = fs.readdirSync(sourcePath, {withFileTypes: true});
    for( let i=0; i < dirContents.length; i++ ) {
        const sourceDirEnt = dirContents[i];
        const sourceFile = `${sourcePath}/${sourceDirEnt.name}`
        const targetFile = `${targetPath}/${sourceDirEnt.name}`
        if( sourceDirEnt.isDirectory() ) {
            if( !fs.existsSync(targetFile)) fs.mkdirSync(targetFile)
            mirrorDirs(sourceFile, targetFile)
        } else {
            if( fs.existsSync(targetFile)) fs.unlinkSync(targetFile)
        } 
    }
}

async function processDocs(sourceDocsPath, targetPath) {
    // clear out target and match directory structure with source
    mirrorDirs(sourceDocsPath, targetPath)

    // generate list of sourceFiles
    const resourceMapJSON = fs.readFileSync('resources/resource_map.json', 'utf-8')
    const resourceMap = JSON.parse(resourceMapJSON)
    const { resources } = resourceMap

    for( const resource of resources ) {
        const { resource_guid: id, name, local_id: localID, resource_type: resourceType, parent_guid: parentResource } = resource
        if( resourceType === 'text' && parentResource === null ) {
            const sourceFile = `resources/${id}`
            const content = convertToHTML(sourceFile)
            const html = pageTemplate(name,content)
            const targetFile = `${targetPath}/${localID}.html`
            fs.writeFileSync(targetFile, html, "utf8")    
        }
    }
}

async function run() {
    dirExists('content')
    dirExists('content/texts')
    await processDocs('resources','content/texts')
}

function main() {
    run().then(() => {
        let date = new Date();
        console.info(`Whale surfaced at ${date.toLocaleTimeString()}.`)
    }, (err) => {
        let date = new Date();
        console.info(`Whale dove to the depths at ${date.toLocaleTimeString()}.`)
        console.error(`${err}: ${err.stack}`)  
    });
}

///// RUN THE SCRIPT
main()
