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

function convertToHTML( contentXML ) {
    const htmlDOM = new JSDOM()
    const ceTEI = new CETEI(htmlDOM.window)

    try {
        const xmlDOM = new JSDOM(contentXML, { contentType: "text/xml" })    
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

function renderText(localID, contentXML, targetPath) {
    const content = convertToHTML(contentXML)
    const html = pageTemplate(localID,content)
    const targetFile = `${targetPath}/${localID}.html`
    fs.writeFileSync(targetFile, html, "utf8")        
}

function renderHeader(header, targetPath) {
    const markdown = headerTemplate(header.title)
    const targetFile = `${targetPath}/_index.md`
    fs.writeFileSync(targetFile, markdown, "utf8")        
}

function renderTEIDoc(teiDoc, targetPath) {
    const teiDocPath = `${targetPath}/${teiDoc.id}`
    dirExists(teiDocPath)

    // first render the top level page
    renderHeader(teiDoc.header, targetPath)

    // then render the children
    for( const resource of teiDoc.resources ) {
        const { local_id: localID, resource_type: resourceType, content } = resource
        if( resourceType === 'text' ) {
            renderText(localID, content, teiDocPath)
        }
    }
}

function parseTEIDoc(teidocID, teidocXML) {
    // pull out resources and create resourceMap
    
    const xmlDom = new JSDOM(teidocXML, { contentType: "text/xml" }).window.document

    const teiEl = xmlDom.getElementsByTagName('tei')[0] || xmlDom.getElementsByTagName('TEI')[0]
    if( !teiEl ) {
        throw new Error('Document must contain a <TEI> element.')
    }
    const teiHeaderEl = teiEl.getElementsByTagName('teiheader')[0] || teiEl.getElementsByTagName('teiHeader')[0]

    let textEls = teiEl.getElementsByTagName('text') 
    if( textEls.length === 0 ) textEls = teiEl.getElementsByTagName('TEXT')

    let standOffEls = teiEl.getElementsByTagName('standOff') 
    if( standOffEls.length === 0 ) standOffEls = teiEl.getElementsByTagName('STANDOFF')

    let sourceDocEls = teiEl.getElementsByTagName('sourceDoc') 
    if( sourceDocEls.length === 0 ) sourceDocEls = teiEl.getElementsByTagName('SOURCEDOC')

    let facsEls = teiEl.getElementsByTagName('facsimile') 
    if( facsEls.length === 0 ) facsEls = teiEl.getElementsByTagName('FACSIMILE')

    if( textEls.length === 0 && facsEls.length === 0 && standOffEls.length === 0 && sourceDocEls.length === 0 ) {
        throw new Error('<TEI> element must contain one more more <text>, <standOff>, <sourceDoc>, or <facsimile> elements.')
    } 

    const resources = []
    for( let i=0; i < textEls.length; i++ ) {
        const contentEl = textEls[i]
        const resource_guid = `${teidocID}-text${i}`
        const local_id = contentEl.getAttribute('xml:id')
        const resource_type = 'text'
        const content = contentEl.outerHTML
        const resource = { resource_guid, local_id, resource_type, content }
        resources.push(resource)
    }
    for( let i=0; i < standOffEls.length; i++ ) {
        const contentEl = standOffEls[i]
        const resource_guid = `${teidocID}-sourceDoc${i}`
        const local_id = contentEl.getAttribute('xml:id')
        const resource_type = 'sourceDoc'
        const content = contentEl.outerHTML
        const resource = { resource_guid, local_id, resource_type, content }
        resources.push(resource)
    }
    for( let i=0; i < sourceDocEls.length; i++ ) {
        const contentEl = sourceDocEls[i]
        const resource_guid = `${teidocID}-standOff${i}`
        const local_id = contentEl.getAttribute('xml:id')
        const resource_type = 'standOff'
        const content = contentEl.outerHTML
        const resource = { resource_guid, local_id, resource_type, content }
        resources.push(resource)
    }
    for( let i=0; i < facsEls.length; i++ ) {
        const contentEl = facsEls[i]
        const resource_guid = `${teidocID}-facs${i}`
        const local_id = contentEl.getAttribute('xml:id')
        const resource_type = 'facs'
        const content = contentEl.outerHTML
        const resource = { resource_guid, local_id, resource_type, content }
        resources.push(resource)
    }

    const resource_guid = `${teidocID}-header`
    const local_id = teiHeaderEl.getAttribute('xml:id')
    const titleEl = teiHeaderEl.getElementsByTagName('title')[0]
    const title = titleEl ? titleEl.innerText : 'untitled'
    const resource_type = 'teiheader'
    const content = teiHeaderEl.outerHTML
    const header = { resource_guid, title, local_id, resource_type, content }

    return { id: teidocID, header, resources }
}

async function processDocs(targetPath) {
    clearDir(targetPath)

    // generate list of sourceFiles
    const exampleXML = fs.readFileSync('resources/WAAC_1_01_1943.xml', 'utf-8')
    const teiDocs = [ parseTEIDoc('WAAC_1_01_1943',exampleXML) ]

    for( const teiDoc of teiDocs ) {
        renderTEIDoc(teiDoc, targetPath)
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
