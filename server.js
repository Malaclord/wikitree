const axios = require("axios");
const jsdom = require("jsdom");
const {JSDOM} = require("jsdom");
const fs = require("fs");

const rootUrl = "https://hu.wikipedia.org"
const start = "Harisnyagyártás"
const randomPath = "/wiki/Special:Random"


/*
* TEMPLATE: {
*   this: {
*       href: "/wiki/Foo"
*       name: "Foo"
*   }
*   link: {
*       href: "/wiki/Bar"
*       name: "Bar"
*   }
* }
* */
let dict = []

async function doThing(path, depth) {
    let docString;
    let name;
    let nextPath;

    if (depth-- === 0) return;

    await axios.get(rootUrl+path).then(r => {
        docString = r.data;
    })

    const dom = new JSDOM(docString);
    const doc = dom.window.document.getElementById("mw-content-text").querySelector(":scope > div.mw-parser-output");

    let paragraphs = doc.querySelectorAll(":scope > p, :scope > ul, :scope > ol");

    let i = 0;

    paragraphs.forEach(p => {
        if (i++ !== -1) {
            p.querySelectorAll("a").forEach(a => {
                if (name === undefined && a.href !== "" && a.title !== "" && !a.href.startsWith("#") && !a.href.includes(".") && !a.href.endsWith("redlink=1")) {
                    name = a.title;
                    nextPath = a.href;
                }
            });
        }
    })

    let oldName = dom.window.document.getElementById("firstHeading").querySelector("span.mw-page-title-main").textContent

    console.log(`Found next link for ${oldName}: ${name}, ${nextPath}`)

    dict.push({
        this: {
            href: path,
            name: oldName
        },
        link: {
            href: nextPath,
            name: name
        }
    })

    if (nextPath === undefined) return;

    if (dict.some(item => {
        return item.this.href === nextPath
    })) return;

    if (nextPath.startsWith("http")) {
        return;
    }

    await doThing(nextPath,depth)
}

async function getRandom() {
    let randomUrl = "";

    await axios.get(rootUrl+randomPath).then(function (response) {
        randomUrl = (response.request.res.responseUrl);
    })

    return randomUrl.replace(rootUrl,"");
}

//doThing("/wiki/"+start,200,start)

async function main() {
    for (let i = 0; i < 128; i++) {
        let randomUrl= await getRandom();

        await doThing(randomUrl,1000)

        await fs.writeFile("data.json",JSON.stringify(dict), { flag: 'w' }, (err) => {
            if (err) {
                console.error("Failed to write out dict...")
            } else {
                console.log("Dict saved!")
            }
        })
    }
}

main().then(r => {})
