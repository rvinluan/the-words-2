//helpers
var randomIn = function(arr) {
  return arr[ Math.floor(Math.random() * arr.length) ];
}


var boardWidth = 5;
var boardHeight = 8;
var tileSize = 50;
var margin = browserIsMobile ? 0 : 5;
var fullTileSize = tileSize + margin*2;
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
var numStartingWords = 1;
var startingWords = [];

var wordBank;

var entryBuffer = [];

var gameState = "";
var mode = "";
var currentPuzzle;

function init(md, puz) {
  loadDictionary();
  mode = md;
  currentPuzzle = puz;
  changeModeSettings(mode, puz);
  if(browserIsMobile) {
    resizeBoard();
  } else {
    $(".board, .board-bg, .board-fg").css( {
      "height": (tileSize + margin*2) * boardHeight,
      "width": (tileSize + margin*2) * boardWidth,
    });
  }
  //background
  board.background.empty();
  for(var i = 0; i < boardWidth; i++) {
    for(var j = 0; j < boardHeight; j++) {
      board.background.append( $("<span>").addClass("tile empty") );
    }
  }
  //foreground
  initTiles();
  $('.tile.loading').each(function (i, e) {
    var allLetters = startingWords.reduce(function (p, c) {
      return p += c;
    }, "")
    //reconcile the fact that the linear order of the letters
    //does not match the linear order of the tiles
    $(e).removeClass('loading').text(allLetters[i].toUpperCase());
  })
  //reset button
  if(mode == "puzzle" || mode == "waterfall") {
    var rb = $("<span>").addClass("reset").text("RESET")
    $(".word-bank-text").after( rb );
    rb.on('click', function (e) {
      restart();
    })
  }
  //word bank and letter collection
  if(mode == "puzzle") {
    initWordBank();
    initCollection();
    $("#mobile-keyboard").hide();
  } else if(mode == "waterfall") {
    initWordBank();
    $("#mobile-keyboard").hide();
  } else {
    initCollection();
  }
  moveAddUI();
}

function changeModeSettings(md, puz) {
  var settings = modesData[md];

  boardHeight = settings.boardHeight;
  numStartingWords = settings.numStartingWords;
  if(settings.isPuzzle && puz !== undefined && settings.puzzles[puz].wordBank) {
    wordBank = settings.puzzles[puz].wordBank.slice(0);
  } else {
    wordBank = settings.wordBank;
  }

  if(settings.startingWords.length == 0 && md != "puzzle") {
    for(var i = 0; i < numStartingWords; i++) {
      startingWords.push("");
      for(var j = 0; j < boardWidth; j++) {
        var ltr = randomIn("abcdefghijklmnopqrstuvwxyz".split("")).toUpperCase();
        startingWords[i] += ltr;
      }
    }
  } else {
    if(md == "puzzle") {
      startingWords = settings.puzzles[puz].startingWords;
    } else {
      startingWords = settings.startingWords;
    }
  }

  if(location.search.length > 0) {
    //get rid of non alpha characters
    var newSearch = location.search.replace(/[^a-zA-Z]/g, "");
    board.uncollected = newSearch.toLowerCase().split("");
  } else {
    if(settings.isPuzzle && puz !== undefined && settings.puzzles[puz].uncollected) {
      board.uncollected = settings.puzzles[puz].uncollected.split("");
    } else {
      board.uncollected = settings.uncollected.split("");
    }
  }
}

function resizeBoard() {
  //for different screens
  tileSize = (($(window).height() - 20 - $("#mobile-keyboard").height()) / boardHeight) - 2;
  if(tileSize > 60) { tileSize = 60; }
  fullTileSize = tileSize + margin*2;
  $(".board, .board-bg, .board-fg").css( {
    "height": (tileSize + margin*2) * boardHeight,
    "width": (tileSize + margin*2) * boardWidth,
  });
  $(".board").css("left", "calc(58% - "+(fullTileSize * boardWidth)/2+"px)");
  $(".reason").css("width", fullTileSize * boardWidth);
  $(".uncollected-text").css("left", 10);
  var sheet = document.createElement('style')
  var sheetText = "body.mobile .tile { width: "+tileSize+"px; height: "+tileSize+"px; padding-top: "+tileSize/3+"px; }\n";
  sheetText += " body.mobile .bonus-indicator { width: "+(tileSize-2)+"px; height: "+(tileSize-2)+"px; }"
  sheet.innerHTML = sheetText;
  document.body.appendChild(sheet);
}

function restart() {
  wordBank = [];
  changeModeSettings(mode, currentPuzzle);
  gameState = "playing";
  board.grid = [];
  board.words = [];
  $("#gameover .game-end-word-list").empty();
  board.element.empty();
  board.collected = [];
  $('.uncollected-text span').removeClass("collected");
  $('.word-bank-text span').removeClass("used");
  board.bonusColumn = 0;
  initTiles();
  if(mode == "puzzle") {
    initWordBank();
    initCollection();
  } else if(mode == "waterfall") {
    initWordBank();
  } else {
    initCollection();
  }
  moveAddUI();
}

function changeScreens(screenID) {
  var targetScreen = $("#" + screenID);
  $('.screen').removeClass("active");
  if(targetScreen.is(".subscreen")) {
    targetScreen.parent(".screen").addClass("active");
    targetScreen.addClass("active");
  } else {
    targetScreen.children(".subscreen").removeClass("active");
    targetScreen.addClass("active");
  }
}

function initTiles() {
  var allLetters = startingWords.reduce(function (p, c) {
    return p += c.toUpperCase();
  }, "")
  for(var i = 0; i < boardWidth; i++) {
    board.grid[i] = [];
    for(var j = 0; j < boardHeight; j++) {
      if(j < numStartingWords) {
        var newSpan = $("<span>").addClass("tile");
        newSpan.text( allLetters[ boardWidth*j + i ] )
        reposition(newSpan, i, j);
        board.grid[i][j] = newSpan[0];
        board.element.append( newSpan );
      }
    }
  }
}

function bindEvents() {
  $(document.body)
    .on('keydown', function (e) {
      if(!$("#gameplay").hasClass("active")) {
        return;
      }
      if( e.which == 48 ) {
        //0, test key
        //newRowFromBottom();
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
        //no modifiers
        if(mode == "puzzle" || mode == "waterfall") {
          return;
        }
        if(e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) {
          return;
        }
        //a-z
        addToEntryBuffer(String.fromCharCode(e.which));
      }
    })
  if(!browserIsMobile) {
    board.element
      .on('mouseover', '.tile:not(.empty)', function (e) {
        highlightLetters( this );
      })
      .on('mouseleave', '.tile:not(.empty)', function (e) {
        $('.tile').removeClass('highlighted selected');
      })
      .on('click', '.tile:not(.empty)', function (e) {
        clearTile(this, true);
      });
    $("#menu .mode-select")
      .on('mouseover', function (e) {
        var t = $(this).attr("data-explanation");
        $(".explanation").text(t).show();
      })
      .on('mouseleave', function (e) {
        $(".explanation").text("Thanks for playtesting! Select a mode to start.");
      })
  }
  $(".word-bank-text").on('click', 'span', function (e) {
    if($(this).hasClass("used")) {
      return;
    }
    $(this).removeClass("unused").addClass("used");
    wordBank.splice(wordBank.indexOf($(this).text()), 1);
    manuallyDropWord($(this).text());
  });
  $("#menu .theme-select").on('click', 'li', function (e) {
    $(document.body).attr("data-theme", $(this).text());
  })
  $("#menu .mode-select").on('click', function (e) {
      var d = $(this).text();
      var isPuzzle = $(this).is('[puzzle-mode]');
      e.preventDefault();
      $(this).blur();
      if(isPuzzle) {
        changeScreens("puzzle-select");
        $(".puzzle-list").attr("data-mode", d);
        loadAvailablePuzzles(d);
      } else {
        changeScreens("gameplay");
        gameState = "playing";
        init(d);
      }
    });
  $("#puzzle-select .puzzle-list").on('click', 'li', function (e) {
    var puzzleName = $(this).attr("data-puzzle-id");
    changeScreens("gameplay");
    gameState = "playing";
    init($(this).parent(".puzzle-list").attr("data-mode"), puzzleName);
  });
  $("#gameplay .help").on('click', function (e) {
    $(".instructions#"+mode).toggle();
  })
  $("#gameover .restart").on('click', function (e) {
    e.preventDefault();
    $(this).blur();
    restart();
    changeScreens("menu");
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
    bonus = bonus.filter(function (e, i) {
      return i % 2;
    });
  }
  if(mode == "hard" ) {
    return {blob: visited, bonus: bonus};
  } else {
    return {blob: visited, bonus: []};
  }
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
  if(mode !== "normal") {
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
    if($(allRemoved[h]).hasClass("special") && initiator) {
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
      //win check for clear mode
      if((mode == "waterfall") && $(".board-fg").children().length == 0) {
        winGame();
      }
    })
  }
  if(initiator) {
    //this is so much simpler with ES6's 'let' keyword
    //but that doesn't work in safari
    var removeLetterClojure = function(ltr) {
      setTimeout(function () {
        clearTile( allRemoved[ltr] , false);
        if(ltr == allRemoved.length - 1) {
          enforceGravityAll();
        }
      }, 100*ltr);
    }
    for(var k = 0; k < allRemoved.length; k++) {
      removeLetterClojure(k);
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
    var u = $('.uncollected-text').find(".collected_"+t).not(".collected");
    u.first().addClass("collected");
  }
  if((mode !== "clear" && mode !== "waterfall") && board.uncollected.length == 0) {
    winGame();
  }
}

function highlightLetters(tile) {
  if(mode !== "normal") {
    var b = findLetterBlob(tile);
    $(b.blob).addClass('selected');
    $(b.bonus).addClass('highlighted');
  } else {
    $(findAllMatchingLetters(tile)).addClass('selected');
  }
}

function glowMatchingTiles(tile) {
  if(mode !== "normal") {
    var b = findLetterBlob(tile);
    $(b.blob).addClass('selected');
    $(b.bonus).addClass('highlighted');
    setTimeout(function () {
      $(b.blob).removeClass('selected');
      $(b.bonus).removeClass('highlighted');
    }, 300)
  } else {
    $(findAllMatchingLetters(tile)).addClass('selected').removeClass('glow');
    setTimeout(function () {
      $(findAllMatchingLetters(tile)).removeClass('selected').addClass('glow');
    }, 300)
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
  var boardPadding = browserIsMobile ? 0 : 10;
  var y = boardHeight - lastFullRow();
  $('.reason').css('top', (y*fullTileSize)+boardPadding-(fullTileSize/2)-5);
  $('.bonus-indicator').css('top', (y-1)*(fullTileSize)+boardPadding+margin+1);
  $('.bonus-indicator').css('left', (board.bonusColumn)*fullTileSize+boardPadding+margin+1);
}

function stopEntry(force) {
  function closeEntry() {
    entryBuffer = [];
    $('.enter-buffer').removeClass('enter-buffer');
    if(!force) {
      board.bonusColumn++;
      if(board.bonusColumn >= boardWidth) {
        board.bonusColumn = 0;
        if(mode == "normal" || mode == "hard") {
          newRowFromBottom();
        }
      }
      moveAddUI();
    }
  }
  var validity = isValidWord( entryBuffer.join("") );
  $('.reason').removeClass("shown");
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
    $('.reason').addClass("shown").find("span").text(validity.reason);
    setTimeout(function () {
      $('.reason').removeClass("shown");
    },500)
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
    var x, y;
    if(mode == "waterfall") {
      x = (i + board.bonusColumn) % boardWidth;
      y = startingY + Math.floor((i + board.bonusColumn) / boardWidth);
    } else {
      x = i % boardWidth;
      y = startingY + Math.floor(i / boardWidth);
    }
    var newSpan = $("<span>").addClass("tile enter-buffer");
    if(x == board.bonusColumn && mode !== "waterfall") {
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

function manuallyDropWord(word) {
  $('.enter-buffer').remove();
  entryBuffer = word.toUpperCase().split("");
  updateEntryTiles();
  setTimeout(function () {
    stopEntry();
  }, 200)
}

function initCollection() {
  var parent = $(".uncollected-text");
  parent.empty();
  for(var i = 0; i < board.uncollected.length; i++) {
    var ltr = board.uncollected[i];
    var span = $("<span>").text(ltr).addClass("collected_"+ltr);
    parent.append(span);
  }
}

function initWordBank() {
  var parent = $(".word-bank-text");
  parent.empty();
  for(var i = 0; i < wordBank.length; i++) {
    var span = $("<span>").text(wordBank[i]);
    parent.append(span);
  }
}

function loadDictionary() {
  $.ajax('words.txt', {
    dataType: 'text',
    success: function(data) {
      dictionary = data.split('\n');
    }
  })
}

function loadAvailablePuzzles(mode) {
  var settings = modesData[mode];
  $(".puzzle-list").empty()
  for(var p in settings.puzzles) {
    $(".puzzle-list").append( $("<li>").text(parseInt(p,10)+1).attr("data-puzzle-id", p) );
  }
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
      var item = $("<li>").text(board.words[i]);
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
      var item = $("<li>").text(board.words[i]);
      wordlist.append(item.clone());
    }
    gameState = "won"
  }
}

bindEvents();
// init("normal");
