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

      formNameInput   [0].value = doc["name"];
      formEmailInput  [0].value = doc["email"];
      formAddressInput[0].value = doc["address1"];
      formZIPInput    [0].value = doc["zip"]
      formCommentInput[0].value = doc["action_comment"];
      // take me down to that indent city where the rows align and everything is pretty
      // ohhhh won't you please take me hooome

      $("#ss-submit")[0].click();
    }
    return ok;
  }

  $("form[name=petition]").submit(function(e) {
    e.preventDefault();
    if (postUser($(this))) {
      window.cachedData = $('#what-to-do form').serialize();
      $("input:not([type=image],[type=button],[type=submit])").val('');
      if (!$('body').hasClass('embed') && false) // just turn this thing off since our backend cant support it
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

})(jQuery);
