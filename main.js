//helpers
var randomIn = function(arr) {
  return arr[ Math.floor(Math.random() * arr.length) ];
}

var tileSize = 50;
var margin = 5;
var fullTileSize = tileSize + margin*2;
var boardWidth = 5;
var boardHeight = 10;
var minAllowedMatch = 3;

var board = {
  background: $(".board-bg"),
  element: $(".board-fg"),
  grid: [],
  words: []
}

var dictionary;
var numStartingWords = 3;
var startingWords = [];

var entering = false;
var entryBuffer = [];

function init() {
  loadDictionary();
  for(var i = 0; i < boardWidth; i++) {
    board.grid[i] = [];
    for(var j = 0; j < boardHeight; j++) {
      var newSpan = $("<span>").addClass("tile empty");
      board.background.append( newSpan.clone() );
      if(j < numStartingWords) {
        // newSpanFromRandom(newSpan, i, j);
        newSpanFromStartingWords(newSpan, i, j);
      }
    }
  }
  moveAddUI();
}

function newSpanFromRandom(template, i, j) {
  var ltr = randomIn("etoinshrdlu".split("")).toUpperCase();
  template.removeClass("empty").text( ltr );
  reposition(template, i, j);
  board.grid[i][j] = template[0];
  board.element.append( template );
}

function newSpanFromStartingWords(template, i, j) {
  template.removeClass("empty").addClass("loading");
  template.text("•");
  reposition(template, i, j);
  board.grid[i][j] = template[0];
  board.element.append( template );
}

function bindEvents() {
  $(document.body)
    .on('keydown', function (e) {
      if( e.which == 27 ) {
        //Esc
        e.preventDefault();
        stopEntry(true);
      } else if( e.which == 8 ) {
        //Backspace
        e.preventDefault();
        if(entering) {
          removeFromEntryBuffer();
        }
      } else if(e.which == 13) {
        //Enter key
        if(!entering) {
          startEntry();
        } else {
          stopEntry();
        }
      } else if( e.which >= 65 && e.which <= 90 ) {
        //a-z
        if(entering) {
          addToEntryBuffer(String.fromCharCode(e.which));
        }
      }
    })
  board.element
    .on('mouseover', '.tile:not(.empty)', function (e) {
      highlightLetters( $(this).text() );
    })
    .on('mouseleave', '.tile:not(.empty)', function (e) {
      $('.tile').removeClass('highlighted');
    })
    .on('click', '.tile:not(.empty)', function (e) {
      clearTile(this, true);
    })
  $('.entry-button')
    .on('click', function (e) {
      $(this).blur();
      if(!entering) {
        startEntry();
      } else {
        stopEntry();
      }
    })
}

function reposition(element, col, row) {
  var t = margin*2 + fullTileSize * (boardHeight - 1 - row);
  var l = margin*2 + fullTileSize * col;
  $(element).css({top: t, left: l});
}

function findMatchingLetters(ltr) {
  return $('.tile').filter(function (index, element) {
    var l = $(element).text().toLowerCase();
    return l == ltr.toLowerCase();
  })
}

function clearTile(tileElement, initiator) {
  var index = $(tileElement).index(),
      row, col,
      allRemoved = findMatchingLetters($(tileElement).text());
  if(initiator && allRemoved.length < minAllowedMatch) { return; }
  for(var i = 0; i < boardWidth; i++) {
    for(var j = 0; j < boardHeight; j++) {
      if( board.grid[i][j] == tileElement ) {
        col = i;
        row = j;
        board.grid[i][j] = null;
      }
    }
  }
  $(tileElement).remove();
  if(col !== undefined) {
    enforceGravity(col);
  }
  if(initiator) {
    for(var k = 0; k < allRemoved.length; k++) {
      clearTile( allRemoved[k] , false);
    }
  }
}

function enforceGravity(column) {
  var tiles = board.grid[column];
  var newColumn = tiles.filter(function (e, i) {
    return e !== null && e !== undefined;
  })
  for(var k = 0; k < newColumn.length; k++) {
    reposition(newColumn[k], column, k);
  }
  board.grid[column] = newColumn;
  moveAddUI();
}


function highlightLetters(ltr) {
  var arr = findMatchingLetters(ltr);
  $(arr).addClass('highlighted');
}

function lastFullRow() {
  var lengths = [];
  for(var i = 0; i < boardWidth; i++) {
    var realLength = board.grid[i].filter(function (e, i) {
      return e !== null;
    }).length;
    lengths.push(realLength);
  }
  return Math.max.apply(null, lengths);
}

function moveAddUI() {
  var y = lastFullRow();
  $('.entry-button').css('bottom', (y*fullTileSize)+28);
  $('.reason').css('bottom', (y*fullTileSize)+28);
}

function startEntry() {
  entering = true;
  $(document.body).addClass('entering');
  $('.entry-button').addClass('entering');
}

function stopEntry(force) {
  function closeEntry() {
    entryBuffer = [];
    $(document.body).removeClass('entering');
    $('.enter-buffer').removeClass('enter-buffer');
    $('.entry-button').removeClass('entering');
    entering = false;
  }
  var ro = isValidWord( entryBuffer.join("") );
  $('.reason').hide();
  if(force) {
    $('.enter-buffer').remove();
    closeEntry();
    return;
  } else if(ro.bool) {
    $('.enter-buffer').each(function (i, elem) {
      var e = $(elem);
      var x = e.attr("data-x");
      var y = e.attr("data-y");
      board.grid[x][y] = elem;
    })
    for(var i = 0; i < boardWidth; i++) {
      enforceGravity(i);
    }
    closeEntry();
  } else {
    $('.reason').show().text(ro.reason);
  }
}

function removeFromEntryBuffer() {
  entryBuffer.pop();
  updateEntryTiles();
}

function addToEntryBuffer(ltr) {
  entryBuffer.push(ltr);
  updateEntryTiles();
}

function updateEntryTiles() {
  var startingY = lastFullRow();
  $('.enter-buffer').remove();
  for(var i = 0; i < entryBuffer.length; i++) {
    var x = i % boardWidth;
    var rows = Math.ceil(entryBuffer.length / boardWidth);
    var y = startingY + rows - 1 - Math.floor(i / boardWidth);
    var newSpan = $("<span>").addClass("tile enter-buffer");
    newSpan.attr("data-x", x);
    newSpan.attr("data-y", y);
    newSpan.text( entryBuffer[i] );
    newSpan.appendTo(board.element);
    reposition(newSpan[0], x, y);
  }
}

function loadDictionary() {
  $.ajax('words.txt', {
    dataType: 'text',
    success: function(data) {
      dictionary = data.split('\n');
      //make starting words
      eligibleWords = dictionary.filter(function (e) {
        return e.length == boardWidth;
      });
      for(var i = 0; i < numStartingWords; i++) {
        var m = Math.floor(Math.random() * eligibleWords.length);
        startingWords.push(eligibleWords[m]);
      }
      $('.tile.loading').each(function (i, e) {
        var allLetters = startingWords.reduce(function (p, c) {
          return p += c;
        }, "")
        //reconcile the fact that the linear order of the letters
        //does not match the linear order of the tiles
        var pos = ((i % numStartingWords) * boardWidth) + Math.floor(i / numStartingWords);
        $(e).removeClass('loading').text(allLetters[pos].toUpperCase());
      })
    }
  })
}

function isValidWord(word) {
  var ro = {
    bool: true,
    reason: ""
  }
  if(!word) {
    ro.bool = false;
    ro.reason = "Can't be empty";
  } else
  // if(word.length < minAllowedWordLength) { 
  //   ro.bool = false;
  //   ro.reason = "Too short";
  // } else
  // if(word.length > maxAllowedWordLength) {
  //   ro.bool = false;
  //   ro.reason = "Too long";
  // } else
  if(word.match(/^\w*$/g) === null) {
    ro.bool = false;
    ro.reason = "Contains invalid characters";
  } else
  if(board.words.indexOf(word) !== -1) {
    ro.bool = false;
    ro.reason = "Already used";
  } else
  if(dictionary.indexOf(word.toLowerCase()) == -1) {
    ro.bool = false;
    ro.reason = "Not a word";
  }
  return ro;
}

bindEvents();
init();
