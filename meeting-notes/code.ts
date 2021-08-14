figma.showUI(__html__, {width: 360, height: 490});

var selectedElement = null
setSelectedElement();

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

  
};

figma.on("selectionchange", () => {
  setSelectedElement()
  sendText()

  figma.ui.postMessage( { type: 'hasSelection', message: 
    figma.currentPage.selection[0] && 
    selectedElement != figma.currentPage.selection[0] && 
    (figma.currentPage.selection[0] as TextNode).characters ? figma.currentPage.selection[0].name : false }  )
})

function setSelectedElement() {
  console.log('setSelectedElement', selectedElement)
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
    if (!node || !node.characters ) {
      console.log("nothing selected")
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