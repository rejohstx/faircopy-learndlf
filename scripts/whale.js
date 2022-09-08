#!/usr/bin/env node

const fs = require('fs')
const jsdom = require("jsdom")
const { JSDOM } = jsdom

const {CETEI} = require("./CETEI")
const { pageTemplate } = require("./page-template")
const { headerTemplate } = require("./header-template")

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

function clearDir(targetPath) {
    const dirContents = fs.readdirSync(targetPath, {withFileTypes: true});
    for( let i=0; i < dirContents.length; i++ ) {
        const targetDirEnt = dirContents[i];
        const targetFile = `${targetPath}/${targetDirEnt.name}`
        if( targetDirEnt.isDirectory() ) {
            clearDir(targetFile)
            fs.rmdirSync(targetFile)
        } else {
            fs.unlinkSync(targetFile)
        } 
    }
}

function renderText(id, name, localID, targetPath) {
    const sourceFile = `resources/${id}`
    const content = convertToHTML(sourceFile)
    const html = pageTemplate(name,content)
    const targetFile = `${targetPath}/${localID}.html`
    fs.writeFileSync(targetFile, html, "utf8")        
}

function renderHeader(parentName, targetPath) {
    const markdown = headerTemplate(parentName)
    const targetFile = `${targetPath}/_index.md`
    fs.writeFileSync(targetFile, markdown, "utf8")        
}

function renderTEIDoc(parentID, parentName, parentLocalID, resources, targetPath) {

    const teiDocPath = `${targetPath}/${parentLocalID}`
    dirExists(teiDocPath)

    // first render the top level page
    renderHeader(parentName,teiDocPath)

    // then render the children
    for( const resource of resources ) {
        const { resource_guid: id, name, local_id: localID, resource_type: resourceType, parent_guid: parentResource } = resource
        if( parentResource === parentID && resourceType === 'text' ) {
            renderText(id, name, localID, teiDocPath)
        }
    }
}

async function processDocs(targetPath) {
    clearDir(targetPath)

    // generate list of sourceFiles
    const resourceMapJSON = fs.readFileSync('resources/resource_map.json', 'utf-8')
    const resourceMap = JSON.parse(resourceMapJSON)
    const { resources } = resourceMap

    for( const resource of resources ) {
        const { resource_guid: id, name, local_id: localID, resource_type: resourceType, parent_guid: parentResource } = resource
        if( parentResource === null ) {
            if( resourceType === 'text' ) {
                renderText(id, name, localID, targetPath) 
            } else if( resourceType === 'teidoc' ) {
                renderTEIDoc(id, name, localID, resources, targetPath)
            }   
        }
    }    
}

async function run() {
    dirExists('content')
    dirExists('content/en')
    dirExists('content/en/texts')
    await processDocs('content/en/texts')
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
