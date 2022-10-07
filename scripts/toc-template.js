const tocTemplate = function tocTemplate(links) {
    let linkLines = ""
    for( const link of links ) {
        const { name, localID } = link
        linkLines = linkLines.concat(`* [${name}]({{< ref "/texts/${localID}" >}} "${name}")\n`)
    }

    return `---
    title: "TEI Documents"
---
    
${linkLines}`
}
    
    // EXPORTS /////////////
    module.exports.tocTemplate = tocTemplate;