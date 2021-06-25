var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var Cinematic = /** @class */ (function () {
    function Cinematic(options) {
        this.defaults = {
            selector: '',
            poster: '',
            subtitles: '',
            autoplay: false,
            startTime: 0,
            deeplink: '',
            rememberVolume: false,
            quality: '720p',
            sources: [],
            translations: {
                pause: 'Pause',
                play: 'Play',
                restart: 'Restart',
                mute: 'Mute',
                unmute: 'Unmute',
                quality: 'Quality',
                fullscreen: 'Fullscreen',
                close: 'Close',
                deeplink: 'Copy deeplink to clipboard',
                deeplinkCopied: 'Link was copied',
                exitFullscreen: 'Exit Fullscreen',
                showSubtitles: 'Show Subtitles',
                hideSubtitles: 'Hide Subtitles',
            }
        };
        this._sources = [];
        this.totalSeconds = 0;
        this.playedSeconds = 0;
        this.volume = 0;
        this.quality = '';
        this.fullScreenEnabled = false;
        this.userActive = false;
        this.options = __assign(__assign({}, this.defaults), options);
        var _passedContainer = document.querySelector(this.options.selector);
        if (!_passedContainer) {
            throw new Error('CinematicJS: Passed selector does not point to a DOM element.');
        }
        this._container = _passedContainer;
        this.fullScreenEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled;
        this.quality = this.options.quality;
        this.renderPlayer();
        this.setupEvents();
        this._video.load();
        if (this.options.rememberVolume) {
            var storedVolume = this.readFromLocalStore('volume');
            if (storedVolume) {
                this._video.volume = Number.parseFloat(storedVolume);
            }
            var storedMuteState = this.readFromLocalStore('muted');
            if (storedMuteState) {
                this._video.muted = storedMuteState === 'true';
            }
        }
        this._container.cinematic = this;
    }
    Cinematic.prototype.renderPlayer = function () {
        var _this = this;
        this._container.classList.add('video-container');
        var _video = document.createElement('video');
        _video.preload = 'metadata';
        _video.poster = this.options.poster;
        _video.tabIndex = -1;
        // Suppress the unwanted right click context menu of the video element itself
        _video.oncontextmenu = function () { return false; };
        if (this.options.autoplay) {
            _video.autoplay = true;
        }
        this._container.appendChild(_video);
        this._video = _video;
        if (this.options.sources.length === 0) {
            throw new Error('CinematicJS: At least one source has to be passed.');
        }
        var startSource;
        if (this.options.sources.length === 1) {
            startSource = this.options.sources[0];
        }
        else {
            startSource = this.getSourcesForQuality(this.quality);
        }
        if (!startSource) {
            throw new Error('CinematicJS: Passed quality does not match any of the passed sources.');
        }
        startSource.sources.forEach(function (source) {
            var _source = document.createElement('source');
            _source.src = source.source;
            _source.type = source.type;
            _video.appendChild(_source);
            _this._sources.push(_source);
        });
        if (this.options.subtitles) {
            var _subtitles = document.createElement('track');
            _subtitles.label = 'subtitles';
            _subtitles.kind = 'subtitles';
            _subtitles.src = this.options.subtitles;
            _subtitles.default = true;
            _video.appendChild(_subtitles);
            this.tracks = _video.textTracks[0];
            this.tracks.mode = 'hidden';
            this.cues = this.tracks.cues;
            var _cuesContainer = document.createElement('div');
            _cuesContainer.classList.add('video-cues-container');
            _cuesContainer.classList.add('hidden');
            this._container.appendChild(_cuesContainer);
            var _cues = document.createElement('div');
            _cues.classList.add('video-cues');
            _cues.classList.add('hidden');
            _cuesContainer.appendChild(_cues);
            this._cues = _cues;
            this._cuesContainer = _cuesContainer;
        }
        var _header = document.createElement('div');
        _header.classList.add('video-header');
        this._container.appendChild(_header);
        this._header = _header;
        if (this.options.closeCallback) {
            var _closeButton = document.createElement('i');
            _closeButton.classList.add('video-close-button');
            _closeButton.classList.add('material-icons');
            _closeButton.title = this.options.translations.close;
            _closeButton.textContent = 'close';
            _header.appendChild(_closeButton);
            this._closeButton = _closeButton;
        }
        var _controls = document.createElement('div');
        _controls.classList.add('video-controls');
        this._container.appendChild(_controls);
        this._controls = _controls;
        var _progressWrapper = document.createElement('div');
        _progressWrapper.classList.add('video-progress-wrapper');
        _controls.appendChild(_progressWrapper);
        var _bufferBar = document.createElement('progress');
        _bufferBar.classList.add('video-buffer-bar');
        _bufferBar.value = 0;
        _progressWrapper.appendChild(_bufferBar);
        this._bufferBar = _bufferBar;
        var _progressBar = document.createElement('progress');
        _progressBar.classList.add('video-progress-bar');
        _progressBar.value = 0;
        _progressWrapper.appendChild(_progressBar);
        this._progressBar = _progressBar;
        var _playButton = document.createElement('i');
        _playButton.classList.add('video-control-button');
        _playButton.classList.add('material-icons');
        _playButton.textContent = 'play_arrow';
        _controls.appendChild(_playButton);
        this._playButton = _playButton;
        var _timer = document.createElement('span');
        _timer.classList.add('video-control-timer');
        _timer.textContent = '00:00:00 / 00:00:00';
        _controls.appendChild(_timer);
        this._timer = _timer;
        var _spacer = document.createElement('div');
        _spacer.classList.add('video-control-spacer');
        _controls.appendChild(_spacer);
        var _volumeWrapper = document.createElement('div');
        _volumeWrapper.classList.add('video-volume-wrapper');
        _controls.appendChild(_volumeWrapper);
        var _volumeSlider = document.createElement('input');
        _volumeSlider.type = 'range';
        _volumeSlider.min = '0';
        _volumeSlider.max = '1';
        _volumeSlider.step = '0.05';
        _volumeSlider.value = '1';
        _volumeSlider.classList.add('video-volume-slider');
        _volumeWrapper.appendChild(_volumeSlider);
        this._volumeSlider = _volumeSlider;
        var _volumeButton = document.createElement('i');
        _volumeButton.classList.add('video-control-button');
        _volumeButton.classList.add('material-icons');
        _volumeButton.textContent = 'volume_up';
        _volumeButton.title = this.options.translations.mute;
        _volumeWrapper.appendChild(_volumeButton);
        this._volumeButton = _volumeButton;
        if (this.options.sources.length > 1) {
            var _qualityWrapper = document.createElement('div');
            _qualityWrapper.classList.add('video-control-dropdown');
            _controls.appendChild(_qualityWrapper);
            var _qualityButton = document.createElement('i');
            _qualityButton.classList.add('video-control-button');
            _qualityButton.classList.add('material-icons');
            _qualityButton.textContent = 'settings';
            _qualityButton.title = this.options.translations.quality;
            _qualityWrapper.appendChild(_qualityButton);
            var _dropDownContent_1 = document.createElement('div');
            _dropDownContent_1.classList.add('video-dropdown-content');
            _qualityWrapper.appendChild(_dropDownContent_1);
            this.options.sources.forEach(function (source) {
                var _option = document.createElement('div');
                _option.classList.add('video-quality-option');
                if (_this.quality === source.quality) {
                    _option.classList.add('active');
                }
                _option.dataset.quality = source.quality;
                _option.textContent = source.quality;
                _dropDownContent_1.appendChild(_option);
            });
            this._qualityOptions = _dropDownContent_1.childNodes;
        }
        if (this.options.deeplink) {
            var _deeplinkButton = document.createElement('i');
            _deeplinkButton.classList.add('video-control-button');
            _deeplinkButton.classList.add('material-icons');
            _deeplinkButton.textContent = 'link';
            _deeplinkButton.title = this.options.translations.deeplink;
            _deeplinkButton.dataset.copiedText = this.options.translations.deeplinkCopied;
            _controls.appendChild(_deeplinkButton);
            this._deeplinkButton = _deeplinkButton;
        }
        if (this.options.subtitles) {
            var _captionsButton = document.createElement('i');
            _captionsButton.classList.add('video-control-button');
            _captionsButton.classList.add('material-icons-outlined');
            _captionsButton.textContent = 'subtitles';
            _captionsButton.title = this.options.translations.showSubtitles;
            _controls.appendChild(_captionsButton);
            this._captionsButton = _captionsButton;
        }
        if (this.fullScreenEnabled) {
            var _fullScreenButton = document.createElement('i');
            _fullScreenButton.classList.add('video-control-button');
            _fullScreenButton.classList.add('material-icons');
            _fullScreenButton.textContent = 'fullscreen';
            _fullScreenButton.title = this.options.translations.fullscreen;
            _controls.appendChild(_fullScreenButton);
            this._fullScreenButton = _fullScreenButton;
        }
    };
    Cinematic.prototype.setupEvents = function () {
        var _this = this;
        var me = this;
        this._playButton.addEventListener('click', function (e) {
            if (me._video.paused || me._video.ended) {
                me._video.play();
            }
            else {
                me._video.pause();
            }
        });
        this._volumeButton.addEventListener('click', function (e) {
            me._video.muted = !me._video.muted;
        });
        this._volumeSlider.addEventListener('change', function (e) {
            // To allow the user to change from mute to a specific volume via the slider.
            me._video.muted = false;
            me._video.volume = me.volume = parseFloat(this.value);
        });
        var onCueEnter = function () {
            me._cues.textContent = this.text;
            me._cues.classList.remove('hidden');
        };
        var onCueExit = function () {
            me._cues.textContent = '';
            me._cues.classList.add('hidden');
        };
        this._video.addEventListener('loadedmetadata', function () {
            me.totalSeconds = this.duration;
            me._progressBar.setAttribute('max', me.totalSeconds.toString());
            me._bufferBar.setAttribute('max', me.totalSeconds.toString());
            me.updateTimer();
            if (me.options.startTime > 0) {
                this.currentTime = me.options.startTime;
            }
            if (me.cues) {
                for (var i = 0; i < me.cues.length; i++) {
                    var cue = me.cues[i];
                    cue.onenter = onCueEnter;
                    cue.onexit = onCueExit;
                }
            }
        });
        this._video.addEventListener('timeupdate', function () {
            me.playedSeconds = this.currentTime;
            me._progressBar.value = me.playedSeconds;
            me.updateTimer();
        });
        this._video.addEventListener('volumechange', function () {
            if (me.options.rememberVolume) {
                me.writeToLocalStore('volume', this.volume.toString());
                me.writeToLocalStore('muted', String(this.muted));
            }
            if (me._video.muted) {
                // Set the volume slider to its min value to indicate the mute.
                me._volumeSlider.value = '0';
                me._volumeButton.textContent = 'volume_off';
                me._volumeButton.title = me.options.translations.unmute;
            }
            else {
                me._volumeSlider.value = me._video.volume.toString();
                me._volumeButton.title = me.options.translations.mute;
                if (me.volume > 0.5) {
                    me._volumeButton.textContent = 'volume_up';
                }
                else {
                    me._volumeButton.textContent = 'volume_down';
                }
            }
        });
        this._video.addEventListener('play', function () {
            //me._endcard.classList.add('hidden');
            me._playButton.textContent = 'pause';
            me._playButton.title = me.options.translations.pause;
            me._video.focus();
        });
        this._video.addEventListener('pause', function () {
            //me._endcard.classList.remove('hidden');
            me._playButton.textContent = 'play_arrow';
            me._playButton.title = me.options.translations.play;
        });
        this._video.addEventListener('ended', function () {
            //me._endcard.classList.remove('hidden');
            me._playButton.textContent = 'restart_alt';
            me._playButton.title = me.options.translations.restart;
        });
        this._video.addEventListener('progress', function () {
            if (this.duration > 0) {
                for (var i = 0; i < this.buffered.length; i++) {
                    var bufferRangeIndex = this.buffered.length - 1 - i;
                    var bufferStart = this.buffered.start(bufferRangeIndex);
                    var bufferEnd = this.buffered.end(bufferRangeIndex);
                    if (bufferStart <= this.currentTime) {
                        me._bufferBar.value = (bufferEnd / this.duration) * 100;
                        break;
                    }
                }
            }
        });
        this._video.addEventListener('click', function () {
            if (me._video.paused || me._video.ended) {
                me._video.play();
            }
            else {
                me._video.pause();
            }
            _this.userActive = true;
        });
        this._container.addEventListener('mousemove', function () { return _this.userActive = true; });
        this.userActiveCheck = window.setInterval(function () {
            if (!_this.userActive) {
                return;
            }
            _this.userActive = false;
            _this.showControls();
            clearTimeout(_this.userInactiveTimeout);
            _this.userInactiveTimeout = window.setTimeout(function () {
                if (!_this.userActive) {
                    _this.hideControls();
                    var _activeElement = document.activeElement;
                    if (_activeElement && _activeElement.parentElement == _this._controls) {
                        // We put focus on the video element so hotkeys work again after a control bar button is pressed
                        // and the user is inactive again.
                        _this._video.focus();
                    }
                }
            }, 2000);
        }, 250);
        this._progressBar.addEventListener('click', function (event) {
            var target = event.target;
            var rect = target.getBoundingClientRect();
            var pos = (event.clientX - rect.left) / this.offsetWidth;
            me._video.currentTime = pos * me._video.duration;
        });
        if (this.fullScreenEnabled) {
            this._fullScreenButton.addEventListener('click', function () { return me.toggleFullScreen(); });
            document.addEventListener('fullscreenchange', function () { return _this.handleFullScreenChange(); });
            document.addEventListener('webkitfullscreenchange', function () { return _this.handleFullScreenChange(); });
        }
        if (this.options.sources.length > 1) {
            this._qualityOptions.forEach(function (_qualityOption) {
                _qualityOption.addEventListener('click', function () {
                    var newQuality = _qualityOption.dataset.quality;
                    var currentQuality = me.quality;
                    if (!newQuality || newQuality === currentQuality) {
                        return;
                    }
                    me._qualityOptions.forEach(function (_qualityOption) {
                        _qualityOption.classList.remove('active');
                    });
                    _qualityOption.classList.add('active');
                    var currentTime = me._video.currentTime;
                    var newSource = me.options.sources.find(function (source) { return newQuality === source.quality; });
                    if (!newSource) {
                        return;
                    }
                    newSource.sources.forEach(function (source, index) {
                        var _source = me._sources[index];
                        if (_source) {
                            _source.src = source.source;
                        }
                    });
                    me._video.load();
                    me._video.currentTime = currentTime;
                    me._video.play();
                    me.quality = newQuality;
                });
            });
        }
        if (this.options.deeplink) {
            this._deeplinkButton.addEventListener('click', function () {
                me.copyToClipboard(me.options.deeplink, me._deeplinkButton);
            });
        }
        if (this.options.subtitles) {
            this._captionsButton.addEventListener('click', function () {
                var wasEnabled = me._container.dataset.captions;
                me._container.dataset.captions = !wasEnabled;
                this.classList.toggle('material-icons');
                this.classList.toggle('material-icons-outlined');
                me._cuesContainer.classList.toggle('hidden');
                if (wasEnabled) {
                    this.title = me.options.translations.showSubtitles;
                }
                else {
                    this.title = me.options.translations.hideSubtitles;
                }
            });
        }
        if (this.options.closeCallback) {
            this._closeButton.addEventListener('click', function () {
                var _a;
                (_a = _this.options.closeCallback) === null || _a === void 0 ? void 0 : _a.apply(_this);
            });
        }
        this._video.addEventListener('keyup', function (event) {
            var key = event.key;
            event.preventDefault();
            event.stopPropagation();
            switch (key) {
                // Space bar allows to pause/resume the video
                case ' ':
                    _this.userActive = true;
                    if (_this._video.paused) {
                        _this._video.play();
                    }
                    else {
                        _this._video.pause();
                    }
                    break;
                // Escape leaves the fullscreen when currently enabled
                case 'Escape':
                    _this.userActive = true;
                    if (_this.fullScreenEnabled && _this.isFullScreen()) {
                        _this.toggleFullScreen();
                    }
                    break;
                // Left Arrow skips 10 seconds into the past
                case 'ArrowLeft':
                    _this.userActive = true;
                    _this._video.currentTime -= 10;
                    break;
                // Right Arrow skips 10 seconds into the future
                case 'ArrowRight':
                    _this.userActive = true;
                    _this._video.currentTime += 10;
                    break;
                // Down Arrow decreases the volume by 5%
                case 'ArrowDown':
                    _this.userActive = true;
                    if (_this._video.volume > 0) {
                        var currentVolume = Math.round((_this._video.volume + Number.EPSILON) * 100);
                        _this.volume = (currentVolume - 5) / 100;
                        _this._video.volume = _this.volume;
                        if (_this.volume === 0) {
                            // Also switch on mute when we reach 0% volume
                            _this._video.muted = true;
                        }
                        _this._volumeSlider.value = _this.volume.toString();
                    }
                    break;
                // Up Arrow increases the volume by 5%
                case 'ArrowUp':
                    _this.userActive = true;
                    if (_this._video.volume < 1) {
                        var currentVolume = Math.round((_this._video.volume + Number.EPSILON) * 100);
                        _this.volume = (currentVolume + 5) / 100;
                        _this._video.volume = _this.volume;
                        // Unmute if we previously were muted
                        _this._video.muted = false;
                        _this._volumeSlider.value = _this.volume.toString();
                    }
                    break;
            }
        });
        return true;
    };
    Cinematic.prototype.getSourcesForQuality = function (quality) {
        for (var _i = 0, _a = this.options.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            if (source.quality === quality) {
                return source;
            }
        }
        return null;
    };
    Cinematic.prototype.formatTime = function (seconds) {
        var hourComponent = Math.floor(seconds / 3600);
        var minuteComponent = Math.floor((seconds - (hourComponent * 3600)) / 60);
        var secondComponent = Math.floor(seconds - (hourComponent * 3600) - (minuteComponent * 60));
        var timer = this.toTimerComponent(minuteComponent) + ':' + this.toTimerComponent(secondComponent);
        if (this.totalSeconds >= (60 * 60)) {
            // Include the hours in both timers when the video is at least an hour long
            return this.toTimerComponent(hourComponent) + ':' + timer;
        }
        return timer;
    };
    Cinematic.prototype.toTimerComponent = function (value) {
        return value < 10 ? "0" + value : value;
    };
    Cinematic.prototype.updateTimer = function () {
        this._timer.textContent = this.formatTime(this.playedSeconds) + ' / ' + this.formatTime(this.totalSeconds);
    };
    Cinematic.prototype.writeToLocalStore = function (name, value) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem('cinematic-js-' + name, value);
            }
        }
        catch (e) {
            console.log('CinematicJS: Cannot write to local store', { name: name, value: value, error: e });
        }
    };
    Cinematic.prototype.readFromLocalStore = function (name) {
        try {
            if (window.localStorage) {
                return window.localStorage.getItem('cinematic-js-' + name);
            }
        }
        catch (e) {
            console.log('CinematicJS: Cannot read from local store', { name: name, error: e });
        }
        return null;
    };
    Cinematic.prototype.toggleFullScreen = function () {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        else if (document.webkitFullscreenElement) {
            // Need this to support Safari
            document.webkitExitFullscreen();
        }
        else if (this._container.webkitRequestFullscreen) {
            // Need this to support Safari
            this._container.webkitRequestFullscreen();
        }
        else {
            this._container.requestFullscreen();
        }
    };
    Cinematic.prototype.handleFullScreenChange = function () {
        if (this.isFullScreen()) {
            this._container.dataset.fullscreen = true;
            this._fullScreenButton.textContent = 'fullscreen_exit';
            this._fullScreenButton.title = this.options.translations.exitFullscreen;
        }
        else {
            this._container.dataset.fullscreen = false;
            this._fullScreenButton.textContent = 'fullscreen';
            this._fullScreenButton.title = this.options.translations.fullscreen;
        }
    };
    Cinematic.prototype.showControls = function () {
        this._header.classList.remove('hidden');
        this._controls.classList.remove('hidden');
    };
    Cinematic.prototype.hideControls = function () {
        if (this._video.paused) {
            return;
        }
        this._header.classList.add('hidden');
        this._controls.classList.add('hidden');
    };
    Cinematic.prototype.isFullScreen = function () {
        return document.fullscreenElement || document.webkitFullscreenElement;
    };
    Cinematic.prototype.copyToClipboard = function (text, _element) {
        /*
         * inspired by clipboard.js v1.5.12
         * https://zenorocha.github.io/clipboard.js
         *
         * Licensed MIT © Zeno Rocha
         */
        var fakeElem = document.createElement('textarea');
        fakeElem.contentEditable = 'true';
        // Prevent zooming on iOS
        fakeElem.style.fontSize = '12pt';
        // Reset box model
        fakeElem.style.border = '0';
        fakeElem.style.padding = '0';
        fakeElem.style.margin = '0';
        // Move element out of screen horizontally
        fakeElem.style.position = 'absolute';
        fakeElem.style[document.documentElement.getAttribute('dir') == 'rtl' ? 'right' : 'left'] = '-9999px';
        // Move element to the same position vertically
        fakeElem.style.top = (window.pageYOffset || document.documentElement.scrollTop) + 'px';
        fakeElem.setAttribute('readonly', '');
        fakeElem.value = text;
        document.body.appendChild(fakeElem);
        fakeElem.focus();
        var range = document.createRange();
        range.selectNodeContents(fakeElem);
        var selection = window.getSelection();
        selection === null || selection === void 0 ? void 0 : selection.removeAllRanges();
        selection === null || selection === void 0 ? void 0 : selection.addRange(range);
        fakeElem.setSelectionRange(0, text.length);
        if (document.execCommand('copy') && typeof _element !== 'undefined') {
            _element.classList.add('copied');
            setTimeout(function () {
                _element.classList.remove('copied');
            }, 2000);
        }
        document.body.removeChild(fakeElem);
        /* Try alternative */
        var copy = function (event) {
            if (event.clipboardData) {
                event.clipboardData.setData('text/plain', text);
            }
            else if (window.clipboardData) {
                window.clipboardData.setData('Text', text);
            }
            event.preventDefault();
        };
        window.addEventListener('copy', copy);
        document.execCommand('copy');
        window.removeEventListener('copy', copy);
    };
    return Cinematic;
}());
//# sourceMappingURL=cinematic.js.map