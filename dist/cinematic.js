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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var Cinematic = /** @class */ (function () {
    function Cinematic(options) {
        this.defaults = {
            selector: '',
            baseUri: '../dist',
            autoplay: false,
            startTime: 0,
            deeplink: '',
            rememberVolume: false,
            rememberQuality: false,
            quality: '720p',
            sources: [],
            video: null,
            playlist: null,
            translations: {
                pause: 'Pause',
                play: 'Play',
                restart: 'Restart',
                mute: 'Mute',
                unmute: 'Unmute',
                settings: 'Settings',
                quality: 'Quality',
                playbackSpeed: 'Speed',
                fullscreen: 'Fullscreen',
                close: 'Close',
                deeplink: 'Copy deeplink to clipboard',
                deeplinkCopied: 'Link was copied',
                exitFullscreen: 'Exit Fullscreen',
                showSubtitles: 'Show Subtitles',
                hideSubtitles: 'Hide Subtitles',
                pictureInPicture: 'Picture in picture',
                chromecast: 'Stream',
                showVideoInfo: 'Show video information',
                hideVideoInfo: 'Hide video information'
            }
        };
        this._sources = new Map();
        this.totalSeconds = 0;
        this.playedSeconds = 0;
        this.volume = 0;
        this.quality = '';
        this.speed = 1;
        this.captionsEnabled = false;
        this.fullScreenEnabled = false;
        this.pipEnabled = false;
        this.userActive = false;
        this.options = __assign(__assign({}, this.defaults), options);
        var _passedContainer = document.querySelector(this.options.selector);
        if (!_passedContainer) {
            throw new Error('CinematicJS: Passed selector does not point to a DOM element.');
        }
        this._container = _passedContainer;
        if (this.options.playlist) {
            this.playlist = this.options.playlist;
        }
        else if (this.options.video) {
            this.playlist = new CinematicPlaylist(false, [this.options.video]);
        }
        else {
            throw new Error('CinematicJS: Either a single `video` or a `playlist` has to be passed as options.');
        }
        this.filterPlayableSources();
        this.quality = this.options.quality;
        if (this.options.rememberQuality) {
            var storedQuality = this.readFromLocalStore('quality');
            if (storedQuality) {
                this.quality = this.handleVideoQualityFallback(storedQuality);
            }
        }
        if ('pictureInPictureEnabled' in document) {
            this.pipEnabled = true;
        }
        this.loadIcons();
        this.renderPlayer();
        this.updateDisplayedVideoInfo();
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
    Cinematic.prototype.filterPlayableSources = function () {
        var _video = document.createElement('video');
        for (var _i = 0, _a = this.playlist.videos; _i < _a.length; _i++) {
            var video = _a[_i];
            // Only keep qualities with at least one playable source
            video.sources = video.sources.filter(function (source) {
                // Only keep sources that may be playable by the browser
                source.sources = source.sources.filter(function (source) {
                    return _video.canPlayType(source.type) !== '';
                });
                return source.sources.length > 0;
            });
        }
    };
    Cinematic.prototype.loadIcons = function () {
        var _iconContainer = document.createElement('span');
        _iconContainer.classList.add('cinematicjs-icon-container');
        document.body.appendChild(_iconContainer);
        var request = new XMLHttpRequest();
        request.open("GET", this.options.baseUri + '/icons.svg', true);
        request.responseType = "document";
        request.onload = function () {
            var _a;
            var svg = (_a = request === null || request === void 0 ? void 0 : request.responseXML) === null || _a === void 0 ? void 0 : _a.documentElement;
            // Don't render anything that is not an SVG, e.g. an HTML error page
            if (svg && svg.nodeName === 'svg') {
                _iconContainer.appendChild(svg);
            }
        };
        request.send();
    };
    Cinematic.prototype.renderPlayer = function () {
        var _this = this;
        this._container.classList.add('cinematicjs-video-container');
        this._container.setAttribute('role', 'region');
        this._container.setAttribute('aria-label', 'Video player');
        var initialVideo = this.playlist.getCurrentVideo();
        this._video = document.createElement('video');
        this._video.preload = 'metadata';
        this._video.tabIndex = 0;
        this._video.playsInline = true;
        this._video.setAttribute('aria-label', 'Video player');
        // Suppress the unwanted right-click context menu of the video element itself
        this._video.oncontextmenu = function () { return false; };
        if (this.options.autoplay) {
            this._video.autoplay = true;
        }
        this._container.appendChild(this._video);
        var startSource = initialVideo.getSourcesForQuality(this.quality);
        if (!startSource) {
            throw new Error('CinematicJS: Passed quality does not match any of the passed sources.');
        }
        this.updateVideoSourceElements(startSource.sources);
        this._overlayWrapper = document.createElement('div');
        this._overlayWrapper.classList.add('cinematicjs-video-overlay-wrapper', 'cinematicjs-hidden');
        this._container.appendChild(this._overlayWrapper);
        var _overlayContainer = document.createElement('div');
        _overlayContainer.classList.add('cinematicjs-video-overlay-container');
        this._overlayWrapper.appendChild(_overlayContainer);
        this._overlayIcon = document.createElement('div');
        this._overlayIcon.classList.add('cinematicjs-video-overlay-icon');
        Cinematic.renderButtonIcon(this._overlayIcon, 'mute');
        _overlayContainer.appendChild(this._overlayIcon);
        this._overlayText = document.createElement('div');
        this._overlayText.classList.add('cinematicjs-video-overlay-text');
        _overlayContainer.appendChild(this._overlayText);
        this._uiWrapper = document.createElement('div');
        this._uiWrapper.classList.add('cinematicjs-ui-wrapper');
        this._container.appendChild(this._uiWrapper);
        var _header = document.createElement('div');
        _header.classList.add('cinematicjs-video-header');
        this._uiWrapper.appendChild(_header);
        this._videoTitleIcon = document.createElement('img');
        this._videoTitleIcon.classList.add('cinematicjs-video-icon');
        _header.appendChild(this._videoTitleIcon);
        this._videoTitle = document.createElement('div');
        this._videoTitle.classList.add('cinematicjs-video-title');
        this._videoTitle.addEventListener('click', function () { return _this.handleVideoInfoToggle(); });
        _header.appendChild(this._videoTitle);
        this._videoInfoButton = document.createElement('div');
        this._videoInfoButton.classList.add('cinematicjs-video-info-button');
        this._videoInfoButton.setAttribute('role', 'button');
        this._videoInfoButton.setAttribute('tabindex', '0');
        this._videoInfoButton.setAttribute('aria-label', this.options.translations.showVideoInfo);
        this._videoInfoButton.setAttribute('aria-expanded', 'false');
        this._videoInfoButton.title = this.options.translations.showVideoInfo;
        Cinematic.renderButtonIcon(this._videoInfoButton, 'info');
        _header.appendChild(this._videoInfoButton);
        var _headerSpacer = document.createElement('div');
        _headerSpacer.classList.add('cinematicjs-video-header-spacer');
        _header.appendChild(_headerSpacer);
        this._chromecastButton = document.createElement('div');
        this._chromecastButton.classList.add('cinematicjs-video-control-button', 'cinematicjs-hidden');
        this._chromecastButton.setAttribute('role', 'button');
        this._chromecastButton.setAttribute('tabindex', '0');
        this._chromecastButton.setAttribute('aria-label', this.options.translations.chromecast);
        this._chromecastButton.title = this.options.translations.chromecast;
        Cinematic.renderButtonIcon(this._chromecastButton, 'chromecast');
        _header.appendChild(this._chromecastButton);
        if (this._video.remote) {
            this._video.remote.watchAvailability(function (available) {
                _this._chromecastButton.classList.toggle('cinematicjs-hidden', !available);
            }).catch(function () {
                _this._chromecastButton.classList.add('cinematicjs-hidden');
            });
        }
        if (this.options.closeCallback) {
            this._closeButton = document.createElement('div');
            this._closeButton.classList.add('cinematicjs-video-close-button');
            this._closeButton.setAttribute('role', 'button');
            this._closeButton.setAttribute('tabindex', '0');
            this._closeButton.setAttribute('aria-label', this.options.translations.close);
            this._closeButton.title = this.options.translations.close;
            Cinematic.renderButtonIcon(this._closeButton, 'close');
            _header.appendChild(this._closeButton);
        }
        this._videoDescription = document.createElement('div');
        this._videoDescription.classList.add('cinematicjs-video-description', 'cinematicjs-hidden');
        this._uiWrapper.appendChild(this._videoDescription);
        var _footer = document.createElement('div');
        _footer.classList.add('cinematicjs-video-footer');
        this._uiWrapper.appendChild(_footer);
        var _progressWrapper = document.createElement('div');
        _progressWrapper.classList.add('cinematicjs-video-progress-wrapper');
        _footer.appendChild(_progressWrapper);
        this._bufferBar = document.createElement('progress');
        this._bufferBar.classList.add('cinematicjs-video-buffer-bar');
        this._bufferBar.value = 0;
        _progressWrapper.appendChild(this._bufferBar);
        this._progressBar = document.createElement('progress');
        this._progressBar.classList.add('cinematicjs-video-progress-bar');
        this._progressBar.setAttribute('role', 'slider');
        this._progressBar.setAttribute('aria-label', 'Video progress');
        this._progressBar.setAttribute('aria-valuemin', '0');
        this._progressBar.setAttribute('aria-valuemax', '100');
        this._progressBar.setAttribute('aria-valuenow', '0');
        this._progressBar.setAttribute('tabindex', '0');
        this._progressBar.value = 0;
        _progressWrapper.appendChild(this._progressBar);
        this._controls = document.createElement('div');
        this._controls.classList.add('cinematicjs-video-controls');
        _footer.appendChild(this._controls);
        this._playButton = document.createElement('div');
        this._playButton.classList.add('cinematicjs-video-control-button');
        this._playButton.setAttribute('role', 'button');
        this._playButton.setAttribute('tabindex', '0');
        this._playButton.setAttribute('aria-label', this.options.translations.play);
        Cinematic.renderButtonIcon(this._playButton, 'play');
        this._controls.appendChild(this._playButton);
        this._timer = document.createElement('span');
        this._timer.classList.add('cinematicjs-video-control-timer');
        this._timer.textContent = '00:00:00 / 00:00:00';
        this._controls.appendChild(this._timer);
        var _spacer = document.createElement('div');
        _spacer.classList.add('video-control-spacer');
        this._controls.appendChild(_spacer);
        var _volumeWrapper = document.createElement('div');
        _volumeWrapper.classList.add('cinematicjs-video-volume-wrapper');
        this._controls.appendChild(_volumeWrapper);
        this._volumeSlider = document.createElement('input');
        this._volumeSlider.type = 'range';
        this._volumeSlider.min = '0';
        this._volumeSlider.max = '1';
        this._volumeSlider.step = '0.05';
        this._volumeSlider.value = '1';
        this._volumeSlider.setAttribute('aria-label', 'Volume');
        this._volumeSlider.classList.add('cinematicjs-video-volume-slider');
        _volumeWrapper.appendChild(this._volumeSlider);
        this._volumeButton = document.createElement('div');
        this._volumeButton.classList.add('cinematicjs-video-control-button');
        this._volumeButton.setAttribute('role', 'button');
        this._volumeButton.setAttribute('tabindex', '0');
        this._volumeButton.setAttribute('aria-label', this.options.translations.mute);
        this._volumeButton.title = this.options.translations.mute;
        Cinematic.renderButtonIcon(this._volumeButton, 'sound');
        _volumeWrapper.appendChild(this._volumeButton);
        this._settingsWrapper = document.createElement('div');
        this._settingsWrapper.classList.add('cinematicjs-video-control-dropdown');
        this._controls.appendChild(this._settingsWrapper);
        this._settingsButton = document.createElement('div');
        this._settingsButton.classList.add('cinematicjs-video-control-button');
        this._settingsButton.setAttribute('role', 'button');
        this._settingsButton.setAttribute('tabindex', '0');
        this._settingsButton.setAttribute('aria-label', this.options.translations.settings);
        this._settingsButton.setAttribute('aria-expanded', 'false');
        this._settingsButton.title = this.options.translations.settings;
        Cinematic.renderButtonIcon(this._settingsButton, 'settings');
        this._settingsWrapper.appendChild(this._settingsButton);
        globalThis.addEventListener('click', function (event) {
            // Clicks inside the Dropdown should not close it again.
            if (!(event.target instanceof Element) || !(event.target).matches('.cinematicjs-video-control-dropdown, .cinematicjs-video-control-dropdown *')) {
                _this._settingsWrapper.classList.remove('cinematicjs-dropdown-active');
            }
        });
        var _dropDownContent = document.createElement('div');
        _dropDownContent.classList.add('cinematicjs-video-dropdown-content');
        this._settingsWrapper.appendChild(_dropDownContent);
        this._qualitySettingsSection = document.createElement('div');
        this._qualitySettingsSection.classList.add('cinematicjs-video-dropdown-section');
        _dropDownContent.appendChild(this._qualitySettingsSection);
        var _qualitySettingsTitle = document.createElement('span');
        _qualitySettingsTitle.textContent = this.options.translations.quality;
        this._qualitySettingsSection.appendChild(_qualitySettingsTitle);
        this._qualitySelect = document.createElement('select');
        this._qualitySelect.name = 'quality';
        this._qualitySelect.addEventListener('change', function () { return _this.handleQualityChange(_this._qualitySelect.value); });
        this.renderQualityOptions();
        this._qualitySettingsSection.appendChild(this._qualitySelect);
        var _speedSettingsSection = document.createElement('div');
        _speedSettingsSection.classList.add('cinematicjs-video-dropdown-section');
        _dropDownContent.appendChild(_speedSettingsSection);
        var _speedSettingsTitle = document.createElement('span');
        _speedSettingsTitle.textContent = this.options.translations.playbackSpeed;
        _speedSettingsSection.appendChild(_speedSettingsTitle);
        var _speedSelect = document.createElement('select');
        _speedSelect.name = 'speed';
        _speedSelect.addEventListener('change', function () { return _this.handleSpeedChange(_speedSelect.value); });
        for (var _i = 0, _a = [0.5, 1, 1.25, 1.5, 1.75, 2]; _i < _a.length; _i++) {
            var speedSetting = _a[_i];
            var _option = document.createElement('option');
            _option.textContent = speedSetting + 'x';
            _option.value = speedSetting + '';
            _speedSelect.appendChild(_option);
        }
        _speedSelect.value = '1';
        _speedSettingsSection.appendChild(_speedSelect);
        if (this.options.deeplink) {
            this._deeplinkButton = document.createElement('div');
            this._deeplinkButton.classList.add('cinematicjs-video-control-button');
            this._deeplinkButton.setAttribute('role', 'button');
            this._deeplinkButton.setAttribute('tabindex', '0');
            this._deeplinkButton.setAttribute('aria-label', this.options.translations.deeplink);
            this._deeplinkButton.title = this.options.translations.deeplink;
            this._deeplinkButton.dataset.copiedText = this.options.translations.deeplinkCopied;
            Cinematic.renderButtonIcon(this._deeplinkButton, 'deeplink');
            this._controls.appendChild(this._deeplinkButton);
        }
        this._cuesContainer = document.createElement('div');
        this._cuesContainer.classList.add('cinematicjs-video-cues-container', 'cinematicjs-hidden');
        this._container.appendChild(this._cuesContainer);
        this._cues = document.createElement('div');
        this._cues.classList.add('video-cues', 'cinematicjs-hidden');
        this._cuesContainer.appendChild(this._cues);
        this._captionsButton = document.createElement('div');
        this._captionsButton.classList.add('cinematicjs-video-control-button');
        this._captionsButton.setAttribute('role', 'button');
        this._captionsButton.setAttribute('tabindex', '0');
        this._captionsButton.setAttribute('aria-label', this.options.translations.showSubtitles);
        this._captionsButton.setAttribute('aria-pressed', 'false');
        this._captionsButton.title = this.options.translations.showSubtitles;
        Cinematic.renderButtonIcon(this._captionsButton, 'expanded-cc');
        this._controls.appendChild(this._captionsButton);
        this.prepareSubtitles();
        if (this.pipEnabled) {
            this._pipButton = document.createElement('div');
            this._pipButton.classList.add('cinematicjs-video-control-button');
            this._pipButton.setAttribute('role', 'button');
            this._pipButton.setAttribute('tabindex', '0');
            this._pipButton.setAttribute('aria-label', this.options.translations.pictureInPicture);
            this._pipButton.title = this.options.translations.pictureInPicture;
            Cinematic.renderButtonIcon(this._pipButton, 'inpicture');
            this._controls.appendChild(this._pipButton);
        }
        this._fullScreenButton = document.createElement('div');
        this._fullScreenButton.classList.add('cinematicjs-video-control-button', 'cinematicjs-hidden');
        this._fullScreenButton.setAttribute('role', 'button');
        this._fullScreenButton.setAttribute('tabindex', '0');
        this._fullScreenButton.setAttribute('aria-label', this.options.translations.fullscreen);
        this._fullScreenButton.title = this.options.translations.fullscreen;
        Cinematic.renderButtonIcon(this._fullScreenButton, 'fullscreen');
        this._controls.appendChild(this._fullScreenButton);
    };
    Cinematic.prototype.updateVideoSourceElements = function (sources) {
        var _this = this;
        var _previousSource = null;
        for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
            var source = sources_1[_i];
            var _source = this._sources.get(source.type);
            if (_source) {
                // Update the existing source element
                _source.src = source.source;
                _previousSource = _source;
                return;
            }
            // Create a new source element.
            _source = document.createElement('source');
            _source.src = source.source;
            _source.type = source.type;
            this._sources.set(source.type, _source);
            if (_previousSource) {
                // Insert the new source element after the previous one.
                _previousSource.insertAdjacentElement('afterend', _source);
            }
            else {
                // Insert the first source element at the beginning of the video element.
                this._video.insertBefore(_source, this._video.firstChild);
            }
            _previousSource = _source;
        }
        // Remove all source elements that are not contained in the new sources array.
        this._sources.forEach(function (_source, type) {
            if (!sources.some(function (source) { return source.type === type; })) {
                _source.remove();
                _this._sources.delete(type);
            }
        });
    };
    Cinematic.prototype.renderQualityOptions = function () {
        this._qualitySelect.textContent = '';
        if (this.playlist.getCurrentVideo().sources.length > 1) {
            for (var _i = 0, _a = this.playlist.getCurrentVideo().sources; _i < _a.length; _i++) {
                var source = _a[_i];
                var _option = document.createElement('option');
                _option.textContent = source.quality;
                _option.value = source.quality;
                this._qualitySelect.appendChild(_option);
            }
            this._qualitySelect.value = this.quality;
            this._qualitySettingsSection.classList.remove('cinematicjs-hidden');
        }
        else {
            this._qualitySettingsSection.classList.add('cinematicjs-hidden');
        }
    };
    /**
     * Falls back to the best available quality for the current video when it does not provide the given quality.
     *
     * @param newQuality the preferred quality to play
     * @private
     */
    Cinematic.prototype.handleVideoQualityFallback = function (newQuality) {
        if (!newQuality) {
            return newQuality;
        }
        var currentVideo = this.playlist.getCurrentVideo();
        var newSource = currentVideo.getSourcesForQuality(newQuality);
        if (!newSource) {
            newQuality = currentVideo.getBestAvailableQuality();
        }
        return newQuality;
    };
    Cinematic.prototype.handleQualityChange = function (newQuality) {
        if (!newQuality) {
            return;
        }
        newQuality = this.handleVideoQualityFallback(newQuality);
        var newSource = this.playlist.getCurrentVideo().getSourcesForQuality(newQuality);
        if (!newSource) {
            return;
        }
        if (this.options.rememberQuality) {
            this.writeToLocalStore('quality', newQuality);
        }
        var currentTime = this._video.currentTime;
        var wasPlaying = !this._video.paused;
        this.updateVideoSourceElements(newSource.sources);
        this._video.load();
        this._video.currentTime = currentTime;
        this._video.playbackRate = this.speed;
        if (wasPlaying) {
            this._video.play();
        }
        this.quality = newQuality;
    };
    Cinematic.prototype.handleSpeedChange = function (newSpeed) {
        if (!newSpeed) {
            return;
        }
        this.speed = typeof newSpeed === 'string' ? Number.parseFloat(newSpeed) : newSpeed;
        this._video.playbackRate = this.speed;
    };
    Cinematic.prototype.handleVideoInfoToggle = function () {
        this._videoDescription.classList.toggle('cinematicjs-hidden');
        var isHidden = this._videoDescription.classList.contains('cinematicjs-hidden');
        if (isHidden) {
            this._videoInfoButton.title = this.options.translations.showVideoInfo;
            this._videoInfoButton.setAttribute('aria-label', this.options.translations.showVideoInfo);
            this._videoInfoButton.setAttribute('aria-expanded', 'false');
        }
        else {
            this._videoInfoButton.title = this.options.translations.hideVideoInfo;
            this._videoInfoButton.setAttribute('aria-label', this.options.translations.hideVideoInfo);
            this._videoInfoButton.setAttribute('aria-expanded', 'true');
        }
    };
    Cinematic.prototype.prepareSubtitles = function () {
        var _this = this;
        var _oldTrack = this._video.querySelector('track');
        if (_oldTrack) {
            _oldTrack.remove();
            this._captionsButton.classList.add('cinematicjs-hidden');
        }
        var video = this.playlist.getCurrentVideo();
        if (!video.subtitles) {
            this._cues.classList.add('cinematicjs-hidden');
            this._captionsButton.classList.add('cinematicjs-hidden');
            this.tracks = null;
            this.cues = null;
            return;
        }
        var _subtitles = document.createElement('track');
        _subtitles.label = 'subtitles';
        _subtitles.kind = 'subtitles';
        _subtitles.src = video.subtitles;
        _subtitles.default = true;
        this._video.appendChild(_subtitles);
        if (_subtitles.readyState === 2) {
            this.handleLoadedTrack();
        }
        else {
            _subtitles.addEventListener('load', function () { return _this.handleLoadedTrack(); });
        }
        this._captionsButton.classList.remove('cinematicjs-hidden');
    };
    Cinematic.prototype.handleLoadedTrack = function () {
        this.tracks = this._video.textTracks[0];
        this.tracks.mode = 'hidden';
        this.cues = this.tracks.cues;
        var me = this;
        var onCueEnter = function () {
            me._cues.textContent = this.text;
            me._cues.classList.remove('cinematicjs-hidden');
        };
        var onCueExit = function () {
            me._cues.textContent = '';
            me._cues.classList.add('cinematicjs-hidden');
        };
        if (this.cues) {
            for (var i = 0; i < this.cues.length; i++) {
                var cue = this.cues[i];
                cue.onenter = onCueEnter;
                cue.onexit = onCueExit;
            }
        }
    };
    Cinematic.prototype.setupEvents = function () {
        var _this = this;
        var me = this;
        // Helper function to add both click and keyboard support to buttons
        var addButtonHandler = function (button, handler) {
            button.addEventListener('click', function (e) { return handler(e); });
            button.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handler(e);
                }
            });
        };
        window.addEventListener('resize', function () { return _this.handlePlayerResize(); });
        this.handlePlayerResize();
        if (globalThis.ResizeObserver) {
            new ResizeObserver(function () { return _this.handlePlayerResize(); }).observe(this._container);
        }
        addButtonHandler(this._playButton, function () {
            if (_this._video.ended) {
                _this.playlist.resetToBeginning();
                _this.handleVideoChange();
            }
            else if (_this._video.paused) {
                _this._video.play();
            }
            else {
                _this._video.pause();
            }
        });
        addButtonHandler(this._volumeButton, function () {
            _this._video.muted = !_this._video.muted;
        });
        // Settings button handler
        addButtonHandler(this._settingsButton, function (event) {
            _this._settingsWrapper.classList.toggle('cinematicjs-dropdown-active');
            var isExpanded = _this._settingsWrapper.classList.contains('cinematicjs-dropdown-active');
            _this._settingsButton.setAttribute('aria-expanded', isExpanded.toString());
            if (event) {
                event.stopPropagation();
            }
        });
        this._volumeSlider.addEventListener('change', function () {
            // To allow the user to change from mute to a specific volume via the slider.
            _this._video.muted = false;
            _this._video.volume = _this.volume = Number.parseFloat(_this._volumeSlider.value);
        });
        this._video.addEventListener('loadedmetadata', function () {
            me.totalSeconds = this.duration;
            me._progressBar.setAttribute('max', me.totalSeconds.toString());
            me._bufferBar.setAttribute('max', me.totalSeconds.toString());
            me.updateTimer();
            if (me.options.startTime > 0) {
                this.currentTime = me.options.startTime;
            }
            me.fullScreenEnabled = document.fullscreenEnabled || document.webkitFullscreenEnabled || me._video.webkitSupportsFullscreen;
            me._fullScreenButton.classList.toggle('cinematicjs-hidden', !me.fullScreenEnabled);
        });
        this._video.addEventListener('timeupdate', function () {
            me.playedSeconds = this.currentTime;
            me._progressBar.value = me.playedSeconds;
            // Update aria-valuenow for accessibility
            var percentage = me.totalSeconds > 0 ? Math.round((me.playedSeconds / me.totalSeconds) * 100) : 0;
            me._progressBar.setAttribute('aria-valuenow', percentage.toString());
            me.updateTimer();
        });
        this._video.addEventListener('volumechange', function () {
            if (_this.options.rememberVolume) {
                _this.writeToLocalStore('volume', _this._video.volume.toString());
                _this.writeToLocalStore('muted', String(_this._video.muted));
            }
            if (_this._video.muted) {
                // Set the volume slider to its min value to indicate the mute.
                _this._volumeSlider.value = '0';
                Cinematic.switchButtonIcon(_this._volumeButton, 'mute');
                _this._volumeButton.title = _this.options.translations.unmute;
                _this._volumeButton.setAttribute('aria-label', _this.options.translations.unmute);
            }
            else {
                _this._volumeSlider.value = _this._video.volume.toString();
                _this._volumeButton.title = _this.options.translations.mute;
                _this._volumeButton.setAttribute('aria-label', _this.options.translations.mute);
                if (_this.volume > 0.5) {
                    Cinematic.switchButtonIcon(_this._volumeButton, 'sound');
                }
                else {
                    Cinematic.switchButtonIcon(_this._volumeButton, 'low');
                }
            }
        });
        this._video.addEventListener('play', function () {
            Cinematic.switchButtonIcon(me._playButton, 'pause');
            me._playButton.title = me.options.translations.pause;
            me._playButton.setAttribute('aria-label', me.options.translations.pause);
            me._video.focus();
            // Shows the timer even when the video container is invisible during initialization of the player
            _this.handlePlayerResize();
        });
        this._video.addEventListener('pause', function () {
            Cinematic.switchButtonIcon(me._playButton, 'play');
            me._playButton.title = me.options.translations.play;
            me._playButton.setAttribute('aria-label', me.options.translations.play);
        });
        this._video.addEventListener('ended', function () {
            if (_this.playlist.shouldPlayNextVideo()) {
                _this.playlist.startNextVideo();
                _this.handleVideoChange();
            }
            else {
                Cinematic.switchButtonIcon(_this._playButton, 'repeat');
                _this._playButton.title = me.options.translations.restart;
                _this._playButton.setAttribute('aria-label', me.options.translations.restart);
                _this.showControls();
            }
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
            globalThis.setTimeout(function () {
                if (_this._video.ended) {
                    _this.playlist.resetToBeginning();
                    _this.handleVideoChange();
                    _this.showOverlay('play', null, true);
                }
                else if (me._video.paused) {
                    me._video.play();
                    _this.showOverlay('play', null, true);
                }
                else {
                    me._video.pause();
                    _this.showOverlay('pause', null, true);
                }
                _this.userActive = true;
            }, 300);
        });
        this._video.addEventListener('dblclick', function (event) {
            if (_this.doubleClickTimeout) {
                clearTimeout(_this.doubleClickTimeout);
            }
            // Get the bounding rectangle of target
            var rect = _this._video.getBoundingClientRect();
            var thirds = rect.width / 3;
            // Mouse position
            var x = event.clientX - rect.left;
            if (x <= thirds) {
                _this._video.currentTime -= 10;
                _this.showOverlay('backwards', '- 10s', true);
            }
            else if (x <= thirds * 2) {
                _this.toggleFullScreen();
            }
            else {
                _this._video.currentTime += 10;
                _this.showOverlay('fastforward', '+ 10s', true);
            }
            _this.userActive = true;
        });
        this._container.addEventListener('mousemove', function () { return _this.userActive = true; });
        // Show controls when a video element receives focus
        this._video.addEventListener('focus', function () {
            _this.userActive = true;
            _this.showControls();
        });
        // Keep controls visible when keyboard navigating through them
        this._controls.addEventListener('focusin', function () {
            _this.userActive = true;
            _this.showControls();
        });
        this._progressBar.addEventListener('focus', function () {
            _this.userActive = true;
            _this.showControls();
        });
        this.userActiveCheck = globalThis.setInterval(function () {
            if (!_this.userActive) {
                return;
            }
            _this.userActive = false;
            _this.showControls();
            clearTimeout(_this.userInactiveTimeout);
            _this.userInactiveTimeout = globalThis.setTimeout(function () {
                // Check if any control element has focus
                var _activeElement = document.activeElement;
                var hasControlFocus = _activeElement && (_activeElement.parentElement == _this._controls ||
                    _activeElement == _this._progressBar ||
                    _activeElement == _this._volumeSlider ||
                    _this._controls.contains(_activeElement));
                // We don't want to hide the controls when:
                // - The settings popup is currently open/visible
                // - Any control element has keyboard focus
                if (!_this.userActive && !_this._settingsWrapper.classList.contains('cinematicjs-dropdown-active') && !hasControlFocus) {
                    _this.hideControls();
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
        addButtonHandler(this._fullScreenButton, function () { return me.toggleFullScreen(); });
        document.addEventListener('fullscreenchange', function () { return _this.handleFullScreenChange(); });
        document.addEventListener('webkitfullscreenchange', function () { return _this.handleFullScreenChange(); });
        if (this.options.deeplink) {
            addButtonHandler(this._deeplinkButton, function () {
                if (!_this.options.deeplinkCallback || _this.options.deeplinkCallback.call(_this)) {
                    me.copyToClipboard(me.options.deeplink, me._deeplinkButton);
                }
            });
        }
        addButtonHandler(this._captionsButton, function () {
            me._cuesContainer.classList.toggle('cinematicjs-hidden');
            if (me.captionsEnabled) {
                me._captionsButton.title = me.options.translations.showSubtitles;
                me._captionsButton.setAttribute('aria-label', me.options.translations.showSubtitles);
                me._captionsButton.setAttribute('aria-pressed', 'false');
                Cinematic.switchButtonIcon(me._captionsButton, 'expanded-cc');
            }
            else {
                me._captionsButton.title = me.options.translations.hideSubtitles;
                me._captionsButton.setAttribute('aria-label', me.options.translations.hideSubtitles);
                me._captionsButton.setAttribute('aria-pressed', 'true');
                Cinematic.switchButtonIcon(me._captionsButton, 'cc');
            }
            me.captionsEnabled = !me.captionsEnabled;
        });
        if (this.pipEnabled) {
            addButtonHandler(this._pipButton, function () { return __awaiter(_this, void 0, void 0, function () {
                var error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 5, , 6]);
                            if (!(this._video === document.pictureInPictureElement)) return [3 /*break*/, 2];
                            return [4 /*yield*/, document.exitPictureInPicture()];
                        case 1:
                            _a.sent();
                            return [3 /*break*/, 4];
                        case 2: return [4 /*yield*/, this._video.requestPictureInPicture()];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [3 /*break*/, 6];
                        case 5:
                            error_1 = _a.sent();
                            console.error(error_1);
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
        }
        if (this.options.closeCallback) {
            addButtonHandler(this._closeButton, function () {
                var _a;
                if (_this.isFullScreen()) {
                    _this.toggleFullScreen();
                }
                (_a = _this.options.closeCallback) === null || _a === void 0 ? void 0 : _a.apply(_this);
            });
        }
        // Add keyboard handler for video info button
        addButtonHandler(this._videoInfoButton, function () { return _this.handleVideoInfoToggle(); });
        // Add keyboard handler for chromecast button
        addButtonHandler(this._chromecastButton, function () {
            if (_this._video.remote) {
                _this._video.remote.prompt();
            }
        });
        this._video.addEventListener('keydown', function (event) {
            var key = event.key;
            event.preventDefault();
            event.stopPropagation();
            switch (key) {
                // Space bar allows pausing/resume the video
                case ' ':
                case 'Spacebar':
                    _this.userActive = true;
                    if (_this._video.paused) {
                        _this._video.play();
                        _this.showOverlay('play', null, true);
                    }
                    else {
                        _this._video.pause();
                        _this.showOverlay('pause', null, true);
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
                case 'Left':
                    _this.userActive = true;
                    _this._video.currentTime -= 10;
                    _this.showOverlay('backwards', '- 10s', true);
                    break;
                // Right Arrow skips 10 seconds into the future
                case 'ArrowRight':
                case 'Right':
                    _this.userActive = true;
                    _this._video.currentTime += 10;
                    _this.showOverlay('fastforward', '+ 10s', true);
                    break;
                // Down Arrow decreases the volume by 5%
                case 'ArrowDown':
                case 'Down':
                    _this.userActive = true;
                    if (_this._video.volume > 0) {
                        var currentVolume = Math.round((_this._video.volume + Cinematic.getEpsilon()) * 100);
                        _this.volume = (currentVolume - 5) / 100;
                        _this._video.volume = _this.volume;
                        if (_this.volume === 0) {
                            // Also switch on mute when we reach 0% volume
                            _this._video.muted = true;
                            _this.showOverlay('mute', '0 %', true);
                        }
                        else {
                            _this.showOverlay('low', Math.round(_this.volume * 100) + ' %', true);
                        }
                        _this._volumeSlider.value = _this.volume.toString();
                    }
                    break;
                // Up Arrow increases the volume by 5%
                case 'ArrowUp':
                case 'Up':
                    _this.userActive = true;
                    if (_this._video.volume < 1) {
                        var currentVolume = Math.round((_this._video.volume + Cinematic.getEpsilon()) * 100);
                        _this.volume = (currentVolume + 5) / 100;
                        _this._video.volume = _this.volume;
                        // Unmute if we previously were muted
                        _this._video.muted = false;
                        _this.showOverlay('sound', Math.round(_this.volume * 100) + ' %', true);
                        _this._volumeSlider.value = _this.volume.toString();
                    }
                    break;
            }
        });
        return true;
    };
    Cinematic.prototype.handleVideoChange = function () {
        this.prepareSubtitles();
        this.renderQualityOptions();
        this.handleQualityChange(this.quality);
        this.handleSpeedChange(this.speed);
        this.updateDisplayedVideoInfo();
        this._video.currentTime = 0;
        this._video.play();
    };
    Cinematic.prototype.updateDisplayedVideoInfo = function () {
        var currentVideo = this.playlist.getCurrentVideo();
        this._video.poster = currentVideo.poster || '';
        this._videoTitleIcon.src = currentVideo.titleIcon || '';
        this._videoTitleIcon.classList.toggle('cinematicjs-hidden', this._videoTitleIcon.src.length === 0);
        this._videoTitle.textContent = currentVideo.title || '';
        this._videoTitle.classList.toggle('cinematicjs-clickable', !!currentVideo.description);
        this._videoInfoButton.classList.toggle('cinematicjs-hidden', !currentVideo.description);
        this._videoDescription.textContent = currentVideo.description || '';
    };
    Cinematic.prototype.handlePlayerResize = function () {
        if (this._container.clientWidth >= 328) {
            this._timer.classList.remove('cinematicjs-hidden');
        }
        else {
            this._timer.classList.add('cinematicjs-hidden');
        }
    };
    Cinematic.renderButtonIcon = function (_button, icon) {
        var _icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        _icon.setAttribute('viewBox', '0 0 24 24');
        var _use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        _use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-' + icon);
        _icon.appendChild(_use);
        _button.appendChild(_icon);
    };
    Cinematic.switchButtonIcon = function (_button, newIcon) {
        var _a;
        (_a = _button.querySelector('svg use')) === null || _a === void 0 ? void 0 : _a.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#icon-' + newIcon);
    };
    Cinematic.prototype.showOverlay = function (icon, text, hideAutomatically) {
        var _this = this;
        Cinematic.switchButtonIcon(this._overlayIcon, icon);
        this._overlayText.textContent = text;
        this._overlayWrapper.classList.remove('cinematicjs-hidden');
        clearTimeout(this.overlayHideTimeout);
        if (hideAutomatically) {
            this.overlayHideTimeout = globalThis.setTimeout(function () {
                _this._overlayWrapper.classList.add('cinematicjs-hidden');
            }, 500);
        }
    };
    Cinematic.prototype.formatTime = function (seconds) {
        var hourComponent = Math.floor(seconds / 3600);
        var minuteComponent = Math.floor(seconds / 60 % 60);
        var secondComponent = Math.floor(seconds % 60);
        var timer = this.toTimerComponent(minuteComponent) + ':' + this.toTimerComponent(secondComponent);
        if (this.totalSeconds >= (60 * 60)) {
            // Include the hours in both timers when the video is at least an hour long
            return this.toTimerComponent(hourComponent) + ':' + timer;
        }
        return timer;
    };
    Cinematic.prototype.toTimerComponent = function (value) {
        return value < 10 ? '0' + value : value;
    };
    Cinematic.prototype.updateTimer = function () {
        this._timer.textContent = this.formatTime(this.playedSeconds) + ' / ' + this.formatTime(this.totalSeconds);
    };
    Cinematic.prototype.writeToLocalStore = function (name, value) {
        try {
            if (globalThis.localStorage) {
                globalThis.localStorage.setItem('cinematic-js-' + name, value);
            }
        }
        catch (e) {
            console.log('CinematicJS: Cannot write to local store', { name: name, value: value, error: e });
        }
    };
    Cinematic.prototype.readFromLocalStore = function (name) {
        try {
            if (globalThis.localStorage) {
                return globalThis.localStorage.getItem('cinematic-js-' + name);
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
        else if (this._video.webkitEnterFullscreen) {
            // Need this to support iOS Safari
            this._video.webkitEnterFullscreen();
        }
        else {
            this._container.requestFullscreen();
        }
    };
    Cinematic.prototype.handleFullScreenChange = function () {
        if (this.isFullScreen()) {
            this._container.dataset.fullscreen = true;
            Cinematic.switchButtonIcon(this._fullScreenButton, 'closefullscreen');
            this._fullScreenButton.title = this.options.translations.exitFullscreen;
            this._fullScreenButton.setAttribute('aria-label', this.options.translations.exitFullscreen);
        }
        else {
            this._container.dataset.fullscreen = false;
            Cinematic.switchButtonIcon(this._fullScreenButton, 'fullscreen');
            this._fullScreenButton.title = this.options.translations.fullscreen;
            this._fullScreenButton.setAttribute('aria-label', this.options.translations.fullscreen);
        }
    };
    Cinematic.prototype.showControls = function () {
        this._container.classList.remove('cinematicjs-video-user-inactive');
        this._uiWrapper.classList.remove('cinematicjs-hidden');
    };
    Cinematic.prototype.hideControls = function () {
        if (this._video.paused) {
            return;
        }
        this._container.classList.add('cinematicjs-video-user-inactive');
        this._uiWrapper.classList.add('cinematicjs-hidden');
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
        // Move element out of the screen horizontally
        fakeElem.style.position = 'absolute';
        fakeElem.style[document.documentElement.getAttribute('dir') == 'rtl' ? 'right' : 'left'] = '-9999px';
        // Move element to the same position vertically
        fakeElem.style.top = (window.scrollY || document.documentElement.scrollTop) + 'px';
        fakeElem.setAttribute('readonly', '');
        fakeElem.value = text;
        document.body.appendChild(fakeElem);
        fakeElem.focus();
        var range = document.createRange();
        range.selectNodeContents(fakeElem);
        var selection = globalThis.getSelection();
        selection === null || selection === void 0 ? void 0 : selection.removeAllRanges();
        selection === null || selection === void 0 ? void 0 : selection.addRange(range);
        fakeElem.setSelectionRange(0, text.length);
        if (document.execCommand('copy') && _element !== undefined) {
            _element.classList.add('cinematicjs-copied');
            setTimeout(function () {
                _element.classList.remove('cinematicjs-copied');
            }, 2000);
        }
        fakeElem.remove();
        /* Try alternative */
        var copy = function (event) {
            if (event.clipboardData) {
                event.clipboardData.setData('text/plain', text);
            }
            else if (globalThis.clipboardData) {
                globalThis.clipboardData.setData('Text', text);
            }
            event.preventDefault();
        };
        globalThis.addEventListener('copy', copy);
        document.execCommand('copy');
        globalThis.removeEventListener('copy', copy);
    };
    Cinematic.getEpsilon = function () {
        if (Number.EPSILON) {
            return Number.EPSILON;
        }
        var epsilon = 1;
        while ((1 + 0.5 * epsilon) !== 1) {
            epsilon *= 0.5;
        }
        return epsilon;
    };
    return Cinematic;
}());
var CinematicVideo = /** @class */ (function () {
    function CinematicVideo(options) {
        this.poster = options.poster;
        this.titleIcon = options.titleIcon;
        this.title = options.title;
        this.description = options.description;
        this.subtitles = options.subtitles;
        this.sources = options.sources;
    }
    CinematicVideo.prototype.getSourcesForQuality = function (quality) {
        if (this.sources.length === 1) {
            return this.sources[0];
        }
        for (var _i = 0, _a = this.sources; _i < _a.length; _i++) {
            var source = _a[_i];
            if (source.quality === quality) {
                return source;
            }
        }
        return null;
    };
    CinematicVideo.prototype.getBestAvailableQuality = function () {
        return this.sources[0].quality;
    };
    return CinematicVideo;
}());
var CinematicPlaylist = /** @class */ (function () {
    function CinematicPlaylist(loop, videos) {
        this.loop = loop;
        this.videos = videos;
        this.currentVideo = 0;
        if (this.videos.length === 0) {
            throw new Error('CinematicJS: At least one video has to be passed.');
        }
    }
    CinematicPlaylist.prototype.getCurrentVideo = function () {
        return this.videos[this.currentVideo];
    };
    CinematicPlaylist.prototype.shouldPlayNextVideo = function () {
        return this.videos.length > 1 && (this.currentVideo + 1 < this.videos.length || this.loop);
    };
    CinematicPlaylist.prototype.startNextVideo = function () {
        this.currentVideo++;
        if (this.loop && this.currentVideo >= this.videos.length) {
            this.resetToBeginning();
        }
    };
    CinematicPlaylist.prototype.resetToBeginning = function () {
        this.currentVideo = 0;
    };
    return CinematicPlaylist;
}());
//# sourceMappingURL=cinematic.js.map