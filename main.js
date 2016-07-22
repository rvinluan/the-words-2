//helpers
var randomIn = function(arr) {
  return arr[ Math.floor(Math.random() * arr.length) ];
}

var tileSize = 50;
var margin = 5;
var fullTileSize = tileSize + margin*2;
var boardWidth = 5;
var boardHeight = 8;
var minAllowedMatch = 3;
var matchesForBonus = 4;

var tilesClearing = false;
var board = {
  background: $(".board-bg"),
  element: $(".board-fg"),
  grid: [],
  words: [],
  uncollected: "abcdefghijklmnopqrstuvwxyz".split(""),
  collected: [],
  bonusColumn: 0
}

var dictionary;
var numStartingWords = 3;
var startingWords = [];

var entryBuffer = [];

var gameState = "";
var difficulty = "";

function init(diff) {
  loadDictionary();
  difficulty = diff;
  if(difficulty == "hard") {
    boardHeight = 10;
  } else {
    boardHeight = 8;
  }
  $(".board, .board-bg, .board-fg").height( (tileSize + margin*2) * boardHeight );
  for(var i = 0; i < boardWidth; i++) {
    board.grid[i] = [];
    for(var j = 0; j < boardHeight; j++) {
      var newSpan = $("<span>").addClass("tile empty");
      board.background.append( newSpan.clone() );
      if(j < numStartingWords) {
        newSpanFromRandom(newSpan, i, j);
      }
    }
  }
  initCollection();
  moveAddUI();
}

function restart() {
  gameState = "playing";
  board.grid = [];
  board.words = [];
  $("#gameover .game-end-word-list").empty();
  board.element.empty();
  board.uncollected = "abcdefghijklmnopqrstuvwxyz".split("");
  board.collected = [];
  $('.uncollected-text span').removeClass("collected");
  board.bonusColumn = 0;
  for(var i = 0; i < boardWidth; i++) {
    board.grid[i] = [];
    for(var j = 0; j < boardHeight; j++) {
      var newSpan = $("<span>").addClass("tile empty");
      
      if(j < numStartingWords) {
        newSpanFromRandom(newSpan, i, j);
      }
    }
  }
  moveAddUI();
}

function changeScreens(screenID) {
  $('section.screen').removeClass("active");
  $("#" + screenID).addClass("active");
}

function newSpanFromRandom(template, i, j) {
  var ltr = randomIn("abcdefghijklmnopqrstuvwxyz".split("")).toUpperCase();
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
      if(!$("#gameplay").hasClass("active")) {
        return;
      }
      if( e.which == 48 ) {
        //0, test key
        newRowFromBottom();
      }
      if( e.which == 27 ) {
        //Esc
        e.preventDefault();
        stopEntry(true);
      } else if( e.which == 8 ) {
        //Backspace
        e.preventDefault();
        if(entryBuffer.length > 0) {
          removeFromEntryBuffer();
        }
      } else if(e.which == 13) {
        //Enter key
        if(entryBuffer.length > 0) {
          stopEntry();
        }
      } else if( e.which >= 65 && e.which <= 90 ) {
        //a-z
        addToEntryBuffer(String.fromCharCode(e.which));
      }
    })
  board.element
    .on('mouseover', '.tile:not(.empty)', function (e) {
      highlightLetters( this );
    })
    .on('mouseleave', '.tile:not(.empty)', function (e) {
      $('.tile').removeClass('highlighted selected');
    })
    .on('click', '.tile:not(.empty)', function (e) {
      clearTile(this, true);
    })
  $("#menu .difficulty-select").on('click', function (e) {
    var d = $(this).text();
    e.preventDefault();
    $(this).blur();
    changeScreens("gameplay");
    gameState = "playing";
    init(d);
  })
  $("#gameplay .help").on('click', function (e) {
    $(".instructions#"+difficulty).toggle();
  })
  $("#gameover .restart").on('click', function (e) {
    e.preventDefault();
    $(this).blur();
    changeScreens("gameplay");
    restart();
  })
}

function reposition(element, col, row) {
  var t = margin*2 + fullTileSize * (boardHeight - 1 - row);
  var l = margin*2 + fullTileSize * col;
  $(element).css({top: t, left: l});
  $(element).data("c", col);
  $(element).data("r", row);
}

function findAllMatchingLetters(tileElement) {
  var ltr = $(tileElement).text().toLowerCase();
  return $('.tile').filter(function (index, element) {
    var l = $(element).text().toLowerCase();
    return l == ltr.toLowerCase();
  }).toArray();
}

function findLetterBlob(tile) {
  var queue = [tile];
  var visited = [];
  var bonus = [];
  while(queue.length > 0) {
    var t = queue.pop();
    var contig = findContiguousMatchingLetters(t);
    visited.push(t);
    for(var i = 0; i < contig.length; i++) {
      if(visited.indexOf(contig[i]) == -1 && queue.indexOf(contig[i]) == -1) {
        queue.push(contig[i]);
      }
    }
  }
  if(visited.length >= matchesForBonus) {
    for(var i = 0; i < visited.length; i++) {
      var contig = findContiguousLetters(visited[i], false, false);
      for(var j = 0; j < contig.length; j++) {
        if(visited.indexOf(contig[j]) == -1 && bonus.indexOf(contig[j]) == -1) {
          bonus.push(contig[j]);
        }
      }
    }
    //not so many bonus tiles maybe?
    bonus = bonus.filter((e, i) => i % 2);
  }
  return {blob: visited, bonus: bonus};
}

function findContiguousMatchingLetters(tile) {
  return findContiguousLetters(tile, true, true);
}

function findContiguousLetters(tile, includeDiagonals, matchingOnly) {
  var i = $(tile).data("c");
  var j = $(tile).data("r");
  var newSet = [tile];

  //cardinals
  if(i > 0)                { newSet.push( board.grid[i-1][j] ) };
  if(i < boardWidth-1)     { newSet.push( board.grid[i+1][j] ) };
  if(j > 0)                { newSet.push( board.grid[i][j-1] ) };
  if(j < boardHeight-1)    { newSet.push( board.grid[i][j+1] ) };

  if(includeDiagonals) {
    if(i > 0 && j > 0)                            { newSet.push( board.grid[i-1][j-1] ) };
    if(i < boardWidth-1 && j > 0)                 { newSet.push( board.grid[i+1][j-1] ) };
    if(j < boardHeight-1 && i < boardWidth-1)     { newSet.push( board.grid[i+1][j+1] ) };
    if(j < boardHeight-1 && i > 0)                { newSet.push( board.grid[i-1][j+1] ) };
  }

  if(matchingOnly) {
    newSet = newSet.filter(function (element, index) {
      var l = $(element).text().toLowerCase();
      return l == $(tile).text().toLowerCase();
    });
  }

  //get rid of undefined and null things
  newSet = newSet.filter(function (element, index) {
    return element;
  });

  return newSet;
}

function clearTile(tileElement, initiator) {
  var index = $(tileElement).index(),
      row, col,
      allRemoved;
  if(difficulty == "hard") {
    allRemoved = findLetterBlob(tileElement).blob.concat(findLetterBlob(tileElement).bonus);
  } else {
    allRemoved = findAllMatchingLetters(tileElement);
  }
  if(initiator && allRemoved.length < minAllowedMatch) { return; }
  //sort by y for effect
  allRemoved = allRemoved.sort(function (a, b) {
    if($(a).data("r") == $(b).data("r")) {
      return $(a).data("c") - $(b).data("c");
    } else {
      return -($(a).data("r") - $(b).data("r"));
    }
  })
  for(var h = 0; h < allRemoved.length; h++) {
    if($(allRemoved[h]).hasClass("enter-buffer")) {
      return;
    }
    if($(allRemoved[h]).hasClass("special")) {
      collect(allRemoved[h]);
    }
  }
  for(var i = 0; i < boardWidth; i++) {
    for(var j = 0; j < boardHeight; j++) {
      if( board.grid[i][j] == tileElement ) {
        col = i;
        row = j;
        board.grid[i][j] = null;
      }
    }
  }
  if(!initiator) {
    $(tileElement).addClass("removed");
    $(tileElement).on("transitionend", function(){
      $(this).remove();
    })
  }
  if(initiator) {
    for(let k = 0; k < allRemoved.length; k++) {
      setTimeout(function () {
        clearTile( allRemoved[k] , false);
        if(k == allRemoved.length - 1) {
          enforceGravityAll();
        }
      }, 100*k)
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

function enforceGravityAll() {
  for(var i = 0; i < boardWidth; i++) {
    enforceGravity(i);
  }
}

function newRowFromBottom() {
  for(var i = 0; i < boardWidth; i++) {
    var ltr = randomIn("abcdefghijklmnopqrstuvwxyz".split("")).toUpperCase();
    var newSpan = $("<span>").addClass("tile").text(ltr);
    board.grid[i].splice(0,0,newSpan[0]); //insert in front
    board.element.append( newSpan );
    enforceGravity(i);
  }
}

function collect(tile) {
  var t = $(tile).text().toLowerCase();
  var i = board.uncollected.indexOf(t);
  if(i !== -1) {
    board.uncollected.splice(i, 1);
    board.collected.push(t);
    $('.uncollected-text').find(".collected_"+t).addClass("collected");
  }
  if(board.uncollected.length == 0) {
    winGame();
  }
}

function highlightLetters(tile) {
  if(difficulty == "hard") {
    var b = findLetterBlob(tile);
    $(b.blob).addClass('selected');
    $(b.bonus).addClass('highlighted');
  } else {
    $(findAllMatchingLetters(tile)).addClass('selected');
  }
}

function lastFullRow() {
  var lengths = [];
  for(var i = 0; i < boardWidth; i++) {
    var realLength = board.grid[i].filter(function (e, i) {
      return e !== null;
    }).length;
    lengths.push(realLength);
  }
  var last = Math.max.apply(null, lengths);
  if(last > boardHeight) {
    loseGame();
    return -1;
  } else {
    return last;
  }
}

function moveAddUI() {
  var y = boardHeight - lastFullRow();
  $('.entry-indicator').css('top', (y*fullTileSize)+fullTileSize/2-6);
  $('.reason').css('top', (y*fullTileSize)+10);
  $('.bonus-column-indicator').css('left', (board.bonusColumn)*fullTileSize+10);
}

function stopEntry(force) {
  function closeEntry() {
    entryBuffer = [];
    $('.enter-buffer').removeClass('enter-buffer');
    if(!force) {
      board.bonusColumn++;
      if(board.bonusColumn >= boardWidth) {
        board.bonusColumn = 0;
        newRowFromBottom();
      }
      $('.bonus-column-indicator').css('left', (board.bonusColumn)*fullTileSize+10);
    }
  }
  var validity = isValidWord( entryBuffer.join("") );
  $('.reason').hide();
  if(force) {
    $('.enter-buffer').remove();
    closeEntry();
    return;
  } else if(validity.bool) {
    var newWord = "";
    $('.enter-buffer').each(function (i, elem) {
      var e = $(elem);
      var x = e.attr("data-x");
      var y = e.attr("data-y");
      newWord += e.text();
      board.grid[x][y] = elem;
    })
    board.words.push(newWord.toLowerCase());
    for(var i = 0; i < boardWidth; i++) {
      enforceGravity(i);
    }
    closeEntry();
  } else {
    $('.reason').show().text(validity.reason);
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
    var y = startingY + Math.floor(i / boardWidth);
    var newSpan = $("<span>").addClass("tile enter-buffer");
    if(x == board.bonusColumn) {
      newSpan.addClass("special");
    }
    newSpan.attr("data-x", x);
    newSpan.attr("data-y", y);
    newSpan.data("c", x);
    newSpan.data("r", y);
    newSpan.text( entryBuffer[i] );
    newSpan.appendTo(board.element);
    reposition(newSpan[0], x, y);
  }
}

function initCollection() {
  var parent = $(".uncollected-text");
  for(var i = 0; i < board.uncollected.length; i++) {
    var ltr = board.uncollected[i];
    var span = $("<span>").text(ltr).addClass("collected_"+ltr);
    parent.append(span);
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
        // board.words.push(eligibleWords[m]);
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
  if(board.words.indexOf(word.toLowerCase()) !== -1) {
    ro.bool = false;
    ro.reason = "Already used";
  } else
  if(dictionary.indexOf(word.toLowerCase()) == -1) {
    ro.bool = false;
    ro.reason = "Not a word";
  }
  return ro;
}

function loseGame() {
  if(gameState == "playing") {
    changeScreens("gameover");
    $("#gameover h2").text("so close.");
    var wordlist = $("#gameover .game-end-word-list");
    for(var i in board.words) {
      let item = $("<li>").text(board.words[i]);
      wordlist.append(item.clone());
    }
    gameState = "lost"
  }
}

function winGame() {
  if(gameState == "playing") {
    changeScreens("gameover");
    $("#gameover h2").text("you did it!");
    var wordlist = $("#gameover .game-end-word-list");
    for(var i in board.words) {
      let item = $("<li>").text(board.words[i]);
      wordlist.append(item.clone());
    }
    gameState = "won"
  }
}

bindEvents();
