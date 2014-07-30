// Alert for IE<9
if (!window.jQuery) {
  alert('Sorry! Your browser is super outdated, and might have viruses. Please upgrade to Firefox, Chrome, or a newer version of IE - immediately.');
}

jQuery.template = (function ($) {
    var templates = {};

    return function (target, values) {
        if (!templates[target]) {
            templates[target] = $(target).html();
        }

        var html = templates[target];
        for (var i in values) {
            var pattern = new RegExp('\\$' + i, 'g');
            html = html.replace(pattern, values[i]);
        }

        var $html = $(html);
        for (var i in values) {
            $html.find('.text-' + i).text(values[i]);
        }

        return $html;
    }
})(jQuery);

var photoCloud = {

  // array of submissions from api
  submissions: [],
  processing: false,
  processed: 0,
  limit: 500,
  nodeCount: 0,
  thumbSize: 60,
  rows: 10,
  centerOffset: null,
  bubbleWidth: 250,
  bubblePopDelay: 300,
  bubblePopTimer: null,
  stopRandomBubble: false,
  bubbleRandomInterval: 5000,
  xhr: false,
  $el: $('#wall-scroller'),

  init: function() {
    this.centerOffset = this.$el.offset();
    $('section.wall').css('height', this.rows * this.thumbSize + 'px');

    this.load(function() {
      for (var i = 0; i < this.submissions.length; i++)
        this.newNode(this.submissions[i]);
      this.nodeCount = this.processed;
    }.bind(this));


    this.$el.on('click', 'a', function(e) {
      e.preventDefault();
      return false; // nobody gets a link
      if (this.submissions[e.target.id.substr(7)].link)
        window.open(this.sanitize(this.submissions[e.target.id.substr(7)].link));
    }.bind(this));

    this.$el.on('mouseover', 'a', function(e) {
      this.stopRandomBubble = true;
      this.showBubble(e.target.id.substr(7));
    }.bind(this));
    this.$el.on('mouseout', 'a', function(e) {
      this.stopRandomBubble = false;
      this.hideBubbles();
    }.bind(this));

    setInterval(this.showRandomBubble.bind(this), this.bubbleRandomInterval);
  },

  load: function(callback) {
    this.processing = true;

    if (this.xhr) {
      this.xhr.abort();
    }

    this.xhr = $.ajax({
      url: 'https://api.battleforthenet.com/participants',
      data: 'limit='+this.limit+'&skip='+this.processed,
      dataType: 'json',
      type: 'get',
      success: function(data) {
        this.processing = false;
        this.submissions = this.submissions.concat(data);
        if (data.length == 0)
        {
          console.log('OMG EMPTY - starting over');
          this.processed = 0;
        }
        callback();
      }.bind(this)
    })
  },

  loadMore: function(start) {
    start || (start = 0);

    this.stopRandomBubble = true;

    var doReplaceNodeAfterDelay = function(id, data) {
      setTimeout(function() {
        this.replaceNode(id, data);

        if (id >= this.nodeCount - 1)
          this.stopRandomBubble = false;

      }.bind(this), id*10);
    }.bind(this);

    for (var i = start; i < this.nodeCount; i++)
    {
      if (this.processed + i < this.submissions.length - 1)
      {
        doReplaceNodeAfterDelay(i, this.submissions[this.processed + i]);
      }
      else
      {
        console.log('STARVED - need to get more people: ', this.submissions.length);
        return this.load(function() {
          this.loadMore(i);
        }.bind(this));
      }
    }
  },

  newNode: function(data) {
    var maxRandomDelay = 5000;

    var randomDelay = function(id, data, offsets) {
      setTimeout(function() {
        this.loadImageAndDoCallback(this.sanitize(data.avatar), function() {
          this.insertNodeElement(id, data, offsets);
        }.bind(this));
      }.bind(this), Math.floor(Math.random() * maxRandomDelay));
    }.bind(this);

    var offsets = this.getOffsetsByIndex(this.processed);

    if (offsets.OUT_OF_BOUNDS)
      return;

    randomDelay(this.processed, data, offsets);
    this.processed++;
  },

  replaceNode: function(id, data) {
    var offsets = this.getOffsetsByIndex(id);

    if (offsets.OUT_OF_BOUNDS)
      return;

    this.loadImageAndDoCallback(this.sanitize(data.avatar), function() {
      $('#avatar_'+id).css('opacity', 0);
      $('#bubble_'+id).css('opacity', 0);
      $('#pointy_'+id).css('opacity', 0);
      setTimeout(function() {
        $('#avatar_'+id).remove();
        $('#bubble_'+id).remove();
        $('#pointy_'+id).remove();
        this.insertNodeElement(id, data, offsets);
      }.bind(this), 1000);
    }.bind(this));

    this.processed++;
  },

  loadImageAndDoCallback: function(src, callback) {
    var image = new Image();
    image.src = src;
    image.onload = callback;
    image.onerror = callback;
  },

  insertNodeElement: function(id, data, offsets) {
    var a = $('<a/>', {
      id: 'avatar_'+id,
      class: data.link ? /*'link'*/ '' : '',
      style: 'left:'+offsets.left+'px; \
              top:'+offsets.top+'px; \
              width:'+this.thumbSize+'px; \
              height:'+this.thumbSize+'px; \
              background-image: url('+this.sanitize(data.avatar)+'); \
              background-size: '+this.thumbSize+'px auto;'
    });
    a.attr({
      href: '#',
      target: '_blank'
    });
    a.appendTo(this.$el);
    setTimeout(function() {
      a.css('opacity', 1);
    }, 10);

    var bOffsetX = offsets.left-(this.bubbleWidth/2)+(this.thumbSize/2);
    var bOffsetY = (offsets.top*-1)+this.thumbSize+14;

    if (bOffsetX + this.centerOffset.left < 10)
      bOffsetX = (this.centerOffset.left*-1)+10;
    else if (bOffsetX + this.bubbleWidth > this.centerOffset.left+(this.thumbSize/2))
      bOffsetX = this.centerOffset.left-this.bubbleWidth+(this.thumbSize/2)+8;

    var div = $('<div/>', {
      id: 'bubble_'+id,
      class: 'bubble',
      style: 'left:'+bOffsetX+'px; \
              bottom:'+bOffsetY+'px; \
              width:'+this.bubbleWidth+'px;'
    });
    div.html('<strong>'+this.sanitize(data.blurb)+'</strong><span '+(data.link ? /*'class="link"'*/'' : '')+'>'+this.sanitize(data.name)+'</span>');
    div.appendTo(this.$el);

    var aOffsetX = offsets.left+(this.thumbSize/2);
    var aOffsetY = offsets.top-26;

    if (aOffsetX + this.centerOffset.left < 33)
      aOffsetX = (this.centerOffset.left*-1)+33;
    else if (aOffsetX > this.centerOffset.left)
      aOffsetX = this.centerOffset.left+15;

    var arrow = $('<div/>', {
      id: 'pointy_'+id,
      class: 'arrow',
      style: 'left:'+aOffsetX+'px; \
              top:'+aOffsetY+'px;'
    });
    arrow.appendTo(this.$el);
  },

  showRandomBubble: function() {
    if (this.stopRandomBubble)
      return false;

    var links = this.$el.find('a');
    var random = Math.floor(Math.random() * links.length);
    this.showBubble(random);
  },

  hideBubbles: function() {
    if (this.bubblePopTimer)
      clearTimeout(this.bubblePopTimer);
    this.bubblePopTimer = null;
    this.$el.find('a').removeClass('hovered');
    $('div.arrow').css('opacity', 0);
    $('div.bubble').css('opacity', 0);
  },

  showBubble: function(id) {
    this.hideBubbles();
    this.bubblePopTimer = setTimeout(function() {
      $('#avatar_'+id).addClass('hovered');
      $('#bubble_'+id).css('opacity', 1);
      $('#pointy_'+id).css('opacity', 1);
    }, this.bubblePopDelay);
  },

  getOffsetsByIndex: function(index)
  {
    var leftMult, col, row;
    var size = this.thumbSize;
    if (index % 2 == 1)
    {
      leftMult = 1;
      row = (((index-1)/2)%this.rows);
      col = Math.floor(((index-1)/2)/this.rows)+1;
    }
    else
    {
      leftMult = -1;
      row = ((index/2)%this.rows);
      col = Math.floor((index/2)/this.rows)+1;
    }
    var info = {
      left: ((leftMult*col*size)-((size/2)*leftMult)),
      top: (row*size)
    };
    if (this.centerOffset.left + info.left + this.thumbSize < 0)
      info.OUT_OF_BOUNDS = true;

    return info;
  },

  sanitize: function(str)
  {
    // str = "TEST LOL javascript: <troll> FUCK javascript: shit babghah";
    str = str.replace(/\</g, '&lt;');
    str = str.replace(/javascript\:/g, 'java script -');
    str = str.replace(/shit/ig, '$#!@');
    str = str.replace(/fuck/ig, '@!#&');
    return str;
  }
};


(function($) {

  if ($('section.wall').length) {
    photoCloud.init();
    $('.wall-under a').click(function(e) {
      e.preventDefault();
      photoCloud.loadMore();
    });
  }

  if ($('a.break').length) {
    $('a.break').click(function(e) {
      e.preventDefault();
      window.open($('a.break').attr('href'));
    });
    setTimeout(function() {
      $('a.break').css('opacity', 1);
    }, 2000);
  }

  if (window.location.href.indexOf('#PARTICIPANT') != -1)
    $('#participantModal').modal('show');

  // ShareProgress Facebook button override
  $('a.share.facebook').click(function(e) {
    e.preventDefault();
    $('#sp_fb a').click();
  });

  // ShareProgress Twitter button override
  $('a.share.twitter').click(function(e) {
    e.preventDefault();
    $('#sp_tw a').click();
  });


  // Prevent tabbing to textarea.
  $('form textarea').on('focus', function(e) {
    $(this).blur();
  });

  // Slide to new hash targets.
  $('a').each(function(i) {
    if (!$(this).attr('href') || !$(this).attr('href').match(/^#/)) {
      return;
    }
    $(this).on('click', function(e) {
      if (this.href.match(/#home/)) {
        return;
      }

      e.preventDefault();

      var target = '#' + this.href.split('#')[1];
      $(target).velocity('scroll', {duration: 777, offset: -66}, function() {
        location.hash = target;
      });
    });
  });

  $(window)
    .on('hashchange', function() {
      var $navigation = $('#navigation a');
      $navigation.removeClass('selected');
      var hash = location.hash || '#home';
      var $selected = $navigation.filter('[href=' + hash + ']');
      if ($selected.length === 0) {
        $selected = $navigation.first();
      }
      $selected.addClass('selected');
    })
    .trigger('hashchange');

  // MODAL //
  // Save comment.
  $('#editModal .modal-footer button').on('click', function(e) {
    e.preventDefault();

    var comment = $('#editModal textarea').val();
    $('#what-to-do form textarea').val(comment);

    $('#editModal').modal('hide');
  });

  var formFields = [
    "action_comment",
    "address1",
    "email",
    "name",
    "zip"
  ];

  function postUser($form) {
    var ok = true;
    var doc = {};
    formFields.forEach(function(field) {
      if ($("input[name=" + field + "]", $form)[0] && $("input[name=" + field + "]", $form).val() === "") {
        ok = false;
      } else {
        doc[field] = $("input[name=" + field + "]", $form).val();
      }
    });

    doc['action_comment'] = $("[name=action_comment]").val();

    doc['org'] = window.org;

    if (ok) {
      alert("this is the point where we'd proxy it over");
      console.log(doc);
      var formNameInput    = $("#entry_419952081");
      var formEmailInput   = $("#entry_896765256");
      var formAddressInput = $("#entry_2045892751");
      var formZIPInput     = $("#entry_1457167586");
      var formCommentInput = $("#entry_427730933");

      formNameInput[0].value = doc["name"];
      formEmailInput[0].value = doc["email"];
      formAddressInput[0].value = doc["address1"];
      formZIPInput[0].value = doc["zip"]
      formCommentInput[0].value = doc["action_comment"];

      $("#ss-submit")[0].click();
    }
    return ok;
  }

  $("form[name=petition]").submit(function(e) {
    e.preventDefault();
    if (postUser($(this))) {
      window.cachedData = $('#what-to-do form').serialize();
      $("input:not([type=image],[type=button],[type=submit])").val('');
      if (!$('body').hasClass('embed'))
        $('#participantModal').modal('show');
      else
        $('#thanksModal').modal('show');
    } else {
      alert('Please complete the rest of the form. Thanks!');
    }
  });

  window.authSuccess = function() {
    var newData = $('#participant_form').serialize();
    var combinedData = window.cachedData + '&' + newData;
    $.ajax({
      url: 'https://api.battleforthenet.com/participant/create',
      type: 'post',
      xhrFields: {
        withCredentials: true
      },
      data: combinedData,
      success: function(res) {
        $('#participantModal').modal('hide');
        $('#thanksModal').modal('show');
      }
    })
  };

  window.authFailure = function() {
    // ...
  };

  $('#participantModal .modal-footer').on('click', function(e) {
    var disabled = $(this).find('a').attr('disabled');
    if (disabled) {
      e.preventDefault();
      $('#participant_link').focus();
      $('#participant_link').select();
    }
  });

  // Send 20% of forms to FP page.
  window.org = '';
  if (Math.random() < 0.20) {
    $('.call-to-action').addClass('fp');
    window.org = 'fp';
  }

  // Political Scoreboard
  $.getJSON('https://spreadsheets.google.com/feeds/list/1-hBOL7oNJXWvUdhK0veiybSXaYFUZu1aNUuRyNeaUmg/default/public/values?alt=json', function(response) {
    var $isotope = $('.isotope');

    // Parse & sort by weight
    var players = [];
    for (var i in response.feed.entry) {
      var player = response.feed.entry[i];

      player = {
        name: player.gsx$name.$t,
        organization: player.gsx$organization.$t,
        image: player.gsx$imagepleasedontedit.$t,
        weight: player.gsx$weight.$t,
        team: player.gsx$team.$t,
        size: player.gsx$size.$t
      };

      if (player.team) {
        players.push(player);
      }
    }

    players = players.sort(function(a, b) {
      return b.weight - a.weight;
    });

    // Create elements
    var $els = $('<div>');
    for (var i in players) {
      if (i > 50) {
        break;
      }

      var player = players[i],
          $el = $.template('#player', player);

      $el.data('meta', player);

      $el.appendTo($els);
    }
    $els.appendTo($isotope);

    // Sort based on teams.
    regenerateWeights(players);

    // Initialize isotope.
    $isotope.isotope({
      getSortData: {
        weight: function (el) {
          var meta = $(el).data('meta');
          return -meta.weightGenerated || -meta.weight;
        }
      },
      itemSelector: '.politician',
      masonry: {
        columnWidth : 150,
        isFitWidth  : true
      },
      sortBy: 'weight'
    });

    // Resort based on teams, every resize.
    $(window).on('resize', function onResize() {
      regenerateWeights(players);
      $isotope.isotope('updateSortData').isotope();
    });
  });

  // Support IE9+
  function getInternetExplorerVersion()
  // Returns the version of Internet Explorer or a -1
  // (indicating the use of another browser).
  {
    var rv = -1; // Return value assumes failure.
    if (navigator.appName == 'Microsoft Internet Explorer')
    {
      var ua = navigator.userAgent;
      var re  = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
      if (re.exec(ua) != null)
        rv = parseFloat( RegExp.$1 );
    }
    return rv;
  }
  if (navigator.userAgent.match('MSIE')) {
    // Fading modals aren't supported.
    $('.modal.fade').removeClass('fade');

    var version = getInternetExplorerVersion();
    if (version < 10) {
      $('body').addClass('oldie');
      $('input, textarea').placeholder();
    }
  }



  // Political Scoreboard logic
  function regenerateWeights(players) {
    var across   = Math.floor($('#political').width() / 150),
        eligible = Math.ceil(across / 3);

    // We can't sort with less than 3 columns.
    if (across < 3) {
      return _.each(players, function (player) {
        player.weightGenerated = null;
      });
    }

    // Create a map, for hit detection.
    var map = [];
    _.times(across, function() {
      map.push([]);
    });

    var position  = { x: 0, y: 0 },
        remaining = players.length,
        weight    = 10000;

    // Add flag to each player.
    _.each(players, function (player) {
      player.positioned = false;
    });


    // Place each player.
    while (remaining > 0) {
      var availability = getSpatialAvailability(position, map);
      if (!availability) {
        position = movePosition(position, map);
        continue;
      }

      var player,
          query = {
            positioned: false
          };

      if (availability === 'small') {
        query.size = 'small';
      }

      if (position.x <= eligible - 1) {
        query.team = 'team-cable';
      } else if (position.x >= across - eligible) {
        query.team = 'team-internet';
      } else {
        query.team = 'undecided';
      }

      player = _.findWhere(players, query);

      if (!player && query.team === 'undecided') {
        if ((position.x + 1) / across > .5) {
          query.team = 'team-internet';
        } else {
          query.team = 'team-cable';
        }
      }

      player = _.findWhere(players, query);

      if (!player) {
        delete query.team;
        player = _.findWhere(players, query);
      }

      player.weightGenerated = weight--;
      player.positioned = true;

      map[position.x][position.y] = true;
      if (player.size === 'large') {
        map[position.x + 1][position.y] = true;
        map[position.x][position.y + 1] = true;
        map[position.x + 1][position.y + 1] = true;
      }

      // printMap(position, map);

      position = movePosition(position, map);

      remaining--;
    }
  }

  function printMap (position, map) {
    var width = map.length;

    console.log('');

    var msg;
    for (var y = 0, yMax = map[0].length; y < yMax; y++) {
      msg = y + ': ';
      for (var x = 0, xMax = map.length; x < xMax; x++) {
        var value = map[x][y];

        var character;
        if (x === position.x && y === position.y) {
          character = '* ';
        } else if (value === undefined) {
          character = '- ';
        } else if (value === true) {
          character = 'x ';
        }

        msg += character;
      }
      console.log(msg + '\n');
    }
  }

  function movePosition (position, map) {
    position.x++;

    if (position.x === map.length) {
      position.x = 0;
      position.y++;
    }

    return position;
  }

  function getSpatialAvailability (position, map) {
    if (map[position.x][position.y]) {
      return false;
    }

    if (
      !map[position.x][position.y + 1] &&
      map[position.x + 1] &&
      !map[position.x + 1][position.y] &&
      !map[position.x + 1][position.y + 1]
    ) {
      return 'large';
    }
    return 'small';
  }

})(jQuery);
