figma.showUI(__html__, {width: 360, height: 490});

/**
 * TODO: figma.viewport.scrollAndZoomIntoView
 * https://www.figma.com/plugin-docs/api/properties/nodes-removed/
 * Show list of available Notes in document to select
 * Don't show close button? (select is enough?) Show back button?
 * Ability to create new Note from plugin
 * Keep reference in newly created notes so you can properly keep track of them
 * figma.ui.resize(width: number, height: number): void
 * doucment.. findAll(callback?: (node: (PageNode | SceneNode)) => boolean): ReadonlyArray<PageNode | SceneNode>
 */

const KEYWORDS = ['Review', 'review', 'Meeting', 'meeting', 'note', 'Note'];
var selectedElement = null
setSelectedElement();
sendNotes()

function sendNotes() {
  figma.ui.postMessage( { type: 'notes', message: findAllNotes()} )
}

figma.ui.onmessage = msg => {
  if (msg.type === 'change') {
    applyToTextNode(msg.data, selectedElement)
  }
  if (msg.type === 'unlock') {
    selectedElement = null;
    figma.ui.postMessage( { type: 'unlocked'} )
    // setSelectedElement()
  }
  if (msg.type === 'unlockandgo') {
    selectedElement = null;
    figma.ui.postMessage( { type: 'unlocked'} )
    setSelectedElement()
  }
  if (msg.type === 'selectNote') {
    selectedElement = figma.getNodeById(msg.message);
    figma.ui.postMessage( { type: 'locked'} )
    sendText()
  }
  if (msg.type === 'focus') {
    if (msg.message) {
      var node = figma.getNodeById(msg.message);
      figma.currentPage = getPageForNode(node)
      figma.viewport.scrollAndZoomIntoView([node]);
    } else {
      figma.currentPage = getPageForNode(selectedElement)
      figma.viewport.scrollAndZoomIntoView([selectedElement]);

    }
  }
  
};

function getPageForNode(node) {
  var cursor = node;
  while (cursor.parent) {
    cursor = cursor.parent
    if (cursor.type == "PAGE") {
      break
    }
  }
  return cursor
}

figma.on("selectionchange", () => {
  setSelectedElement()
  sendText()
  updateSelectionStatus()
  sendNotes()
})

function findAllNotes() {
  let notes = figma.root.findAll(node => {
    let chars = node['characters']
    if (!chars) {
      return false;
    }
    var lines = chars.split('\n')
    if (lines.length < 2) {
      return false;
    }
    return KEYWORDS.some(keyword => {
      return lines[0].indexOf(keyword) != -1
    })
  }) as [BaseNode];

  var rv =  notes.map(note => { 
    var page = getPageForNode(note);
    return {
    id: note.id,
    page: page.name,
    characters: note['characters']
    
  }});
  // console.log(rv)
  return rv;
}

function updateSelectionStatus() {

  figma.ui.postMessage( { type: 'hasSelection', message: 
    figma.currentPage.selection[0] && 
    selectedElement != figma.currentPage.selection[0] && 
    (figma.currentPage.selection[0] as TextNode).characters ? figma.currentPage.selection[0].name : false }  )

}

function setSelectedElement() {
  if (selectedElement) {
    return;
  }


  var node = figma.currentPage.selection[0] as TextNode
  if (node && node.characters ) {
    selectedElement = figma.currentPage.selection[0]
    let len = selectedElement.characters.length
    for (let i = 0; i < len; i++) {
      figma.loadFontAsync(selectedElement.getRangeFontName(i, i+1))
    }
    figma.ui.postMessage( { type: 'locked'} )
  }

  sendText()
}

function convertToMarkdown(node: TextNode) {
  var lines = node.characters.split('\n')
  var convertedLines = lines.map((item, i) => {

    var index = lines.filter((v, pi) => pi < i).reduce((p, c) => {
      return p + c.length + 1 // plus newline
    }, 0)

    // empty line
    if (index +1 > node.characters.length) {
      return "";
    }

    var indent = node.getRangeIndentation(index, index+1) as number
    // TODO check getRangeListOptions for different indents
    var prefix = "";
    if (indent > 0) {
      prefix = "- "
    }
    if (indent > 1) {
      prefix = "    ".repeat(indent - 1) + prefix
    }

    return prefix + item
  })

  return convertedLines.join("\n")
}

function applyToTextNode(markdown: string, node: TextNode) {
  var plaintext = markdown.replace(/^ *- /gm, '');
  var lines = plaintext.split('\n')
  var markDownLines = markdown.split('\n');
  node.characters = plaintext;

  lines.forEach((item, i) => {

    var index = lines.filter((v, pi) => pi < i).reduce((p, c) => {
      return p + c.length + 1
    }, 0)

    var markdownLine = markDownLines[i]

    // console.log(node.characters[index], index, markdownLine)

    if (node.characters[index] == undefined) {

    } else if (markdownLine.indexOf("- ") == 0) {
      node.setRangeIndentation(index, index + 1, 0)
      node.setRangeListOptions(index, index + 1, {
        type: "UNORDERED"
      })
    } else {
      // node.setRangeIndentation(index, index + 1, 0)
      node.setRangeListOptions(index, index + 1, {
        type: "NONE"
      })
    }
  
  })

}

function sendText() {
  try {
    let node = selectedElement
    if (!node ) {
      // console.log("nothing selected")
      return
    }
    if (!node.characters ) {
      // console.log("not a textNode")
      return
    }

    let markdown = convertToMarkdown(node);
    figma.ui.postMessage( { type: 'change', data: markdown} )
  } catch(error) {
    console.error(error)
  }
  
}

setInterval(() => {
  try {
    if (selectedElement && selectedElement.characters.length) {

    }
  } catch(error) {
    // probably deleted
    figma.ui.postMessage( { type: 'unlocked'} )
    selectedElement = null
  }
}, 300)