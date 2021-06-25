interface Document {
    webkitExitFullscreen: any;
    webkitFullscreenElement: any;
    webkitFullscreenEnabled: any;
}

interface Options {
   selector: string;
   poster: string;
   subtitles: string;
   autoplay: boolean;
   startTime: number;
   deeplink: string;
   rememberVolume: boolean;
   quality: string;
   sources: VideoQuality[];
   closeCallback?: CloseCallback;
   translations: Translations;
}

interface CloseCallback {
   (): void;
}

interface VideoQuality {
   quality: string;
   sources: VideoSource[];
}

interface VideoSource {
   type: string;
   source: string;
}

interface Translations {
   pause: string;
   play: string;
   restart: string;
   mute: string;
   unmute: string;
   quality: string;
   fullscreen: string;
   deeplink: string;
   close: string;
   deeplinkCopied: string;
   exitFullscreen: string;
   showSubtitles: string;
   hideSubtitles: string;
}

class Cinematic {

   options: Options;

   defaults: Options = {
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

   _container: any;
   _video: HTMLVideoElement;
   _sources: HTMLSourceElement[] = [];
   _cues: HTMLElement;
   _cuesContainer: HTMLElement;
   _header: HTMLElement;
   _controls: HTMLElement;
   _playButton: HTMLElement;
   _bufferBar: HTMLProgressElement;
   _progressBar: HTMLProgressElement;
   _timer: HTMLElement;
   _volumeSlider: HTMLInputElement;
   _volumeButton: HTMLElement;
   _qualityOptions: NodeListOf<ChildNode>;
   _captionsButton: HTMLElement;
   _deeplinkButton: HTMLElement;
   _fullScreenButton: HTMLElement;
   _closeButton: HTMLElement;

   totalSeconds = 0;
   playedSeconds = 0;
   volume = 0;
   quality = '';
   tracks: TextTrack;
   cues: TextTrackCueList | null;

   fullScreenEnabled = false;
   userActive = false;
   userActiveCheck: number;
   userInactiveTimeout: number;

   constructor(options: Options) {
      this.options = { ...this.defaults, ...options };

      const _passedContainer = document.querySelector(this.options.selector);
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
         const storedVolume = this.readFromLocalStore('volume');
         if (storedVolume) {
            this._video.volume = Number.parseFloat(storedVolume);
         }
         const storedMuteState = this.readFromLocalStore('muted');
         if (storedMuteState) {
            this._video.muted = storedMuteState === 'true';
         }
      }

      this._container.cinematic = this as Cinematic;
   }

   renderPlayer() {
      this._container.classList.add('video-container');

      const _video = document.createElement('video');
      _video.preload = 'metadata';
      _video.poster = this.options.poster;
      _video.tabIndex = -1;
      _video.playsInline = true;
      // Suppress the unwanted right click context menu of the video element itself
      _video.oncontextmenu = () => {return false};
      if (this.options.autoplay) {
         _video.autoplay = true;
      }
      this._container.appendChild(_video);

      this._video = _video;

      if (this.options.sources.length === 0) {
         throw new Error('CinematicJS: At least one source has to be passed.');
      }

      let startSource;
      if (this.options.sources.length === 1) {
         startSource = this.options.sources[0];
      } else {
         startSource = this.getSourcesForQuality(this.quality);
      }
      if (!startSource) {
         throw new Error('CinematicJS: Passed quality does not match any of the passed sources.');
      }

      startSource.sources.forEach(source => {
         const _source = document.createElement('source');
         _source.src = source.source;
         _source.type = source.type;
         _video.appendChild(_source);
         this._sources.push(_source);
      });

      if (this.options.subtitles) {
         const _subtitles = document.createElement('track');
         _subtitles.label = 'subtitles';
         _subtitles.kind = 'subtitles';
         _subtitles.src = this.options.subtitles;
         _subtitles.default = true;
         _video.appendChild(_subtitles);

         this.tracks = _video.textTracks[0];
         this.tracks.mode = 'hidden';
         this.cues = this.tracks.cues;

         const _cuesContainer = document.createElement('div');
         _cuesContainer.classList.add('video-cues-container');
         _cuesContainer.classList.add('hidden');
         this._container.appendChild(_cuesContainer);

         const _cues = document.createElement('div');
         _cues.classList.add('video-cues');
         _cues.classList.add('hidden');
         _cuesContainer.appendChild(_cues);

         this._cues = _cues;

         this._cuesContainer = _cuesContainer;
      }

      const _header = document.createElement('div');
      _header.classList.add('video-header');
      this._container.appendChild(_header);

      this._header = _header;

      if (this.options.closeCallback) {
         const _closeButton = document.createElement('i');
         _closeButton.classList.add('video-close-button');
         _closeButton.classList.add('material-icons');
         _closeButton.title = this.options.translations.close;
         _closeButton.textContent = 'close';
         _header.appendChild(_closeButton);

         this._closeButton = _closeButton;
      }

      const _controls = document.createElement('div');
      _controls.classList.add('video-controls');
      this._container.appendChild(_controls);

      this._controls = _controls;

      const _progressWrapper = document.createElement('div');
      _progressWrapper.classList.add('video-progress-wrapper');
      _controls.appendChild(_progressWrapper);

      const _bufferBar = document.createElement('progress');
      _bufferBar.classList.add('video-buffer-bar');
      _bufferBar.value = 0;
      _progressWrapper.appendChild(_bufferBar);

      this._bufferBar = _bufferBar;

      const _progressBar = document.createElement('progress');
      _progressBar.classList.add('video-progress-bar');
      _progressBar.value = 0;
      _progressWrapper.appendChild(_progressBar);

      this._progressBar = _progressBar;

      const _playButton = document.createElement('i');
      _playButton.classList.add('video-control-button');
      _playButton.classList.add('material-icons');
      _playButton.textContent = 'play_arrow';
      _controls.appendChild(_playButton);

      this._playButton = _playButton;

      const _timer = document.createElement('span');
      _timer.classList.add('video-control-timer');
      _timer.textContent = '00:00:00 / 00:00:00';
      _controls.appendChild(_timer);

      this._timer = _timer;

      const _spacer = document.createElement('div');
      _spacer.classList.add('video-control-spacer');
      _controls.appendChild(_spacer);

      const _volumeWrapper = document.createElement('div');
      _volumeWrapper.classList.add('video-volume-wrapper');
      _controls.appendChild(_volumeWrapper);

      const _volumeSlider = document.createElement('input');
      _volumeSlider.type = 'range';
      _volumeSlider.min = '0';
      _volumeSlider.max = '1';
      _volumeSlider.step = '0.05';
      _volumeSlider.value = '1';
      _volumeSlider.classList.add('video-volume-slider');
      _volumeWrapper.appendChild(_volumeSlider);

      this._volumeSlider = _volumeSlider;

      const _volumeButton = document.createElement('i');
      _volumeButton.classList.add('video-control-button');
      _volumeButton.classList.add('material-icons');
      _volumeButton.textContent = 'volume_up';
      _volumeButton.title = this.options.translations.mute;
      _volumeWrapper.appendChild(_volumeButton);

      this._volumeButton = _volumeButton;

      if (this.options.sources.length > 1) {
         const _qualityWrapper = document.createElement('div');
         _qualityWrapper.classList.add('video-control-dropdown');
         _controls.appendChild(_qualityWrapper);

         const _qualityButton = document.createElement('i');
         _qualityButton.classList.add('video-control-button');
         _qualityButton.classList.add('material-icons');
         _qualityButton.textContent = 'settings';
         _qualityButton.title = this.options.translations.quality;
         _qualityWrapper.appendChild(_qualityButton);

         const _dropDownContent = document.createElement('div');
         _dropDownContent.classList.add('video-dropdown-content');
         _qualityWrapper.appendChild(_dropDownContent);

         this.options.sources.forEach(source => {
            const _option = document.createElement('div');
            _option.classList.add('video-quality-option');
            if (this.quality === source.quality) {
               _option.classList.add('active');
            }
            _option.dataset.quality = source.quality;
            _option.textContent = source.quality;
            _dropDownContent.appendChild(_option);
         });

         this._qualityOptions = _dropDownContent.childNodes;
      }

      if (this.options.deeplink) {
         const _deeplinkButton = document.createElement('i');
         _deeplinkButton.classList.add('video-control-button');
         _deeplinkButton.classList.add('material-icons');
         _deeplinkButton.textContent = 'link';
         _deeplinkButton.title = this.options.translations.deeplink;
         _deeplinkButton.dataset.copiedText = this.options.translations.deeplinkCopied;
         _controls.appendChild(_deeplinkButton);

         this._deeplinkButton = _deeplinkButton;
      }

      if (this.options.subtitles) {
         const _captionsButton = document.createElement('i');
         _captionsButton.classList.add('video-control-button');
         _captionsButton.classList.add('material-icons-outlined');
         _captionsButton.textContent = 'subtitles';
         _captionsButton.title = this.options.translations.showSubtitles;
         _controls.appendChild(_captionsButton);

         this._captionsButton = _captionsButton;
      }

      if (this.fullScreenEnabled) {
         const _fullScreenButton = document.createElement('i');
         _fullScreenButton.classList.add('video-control-button');
         _fullScreenButton.classList.add('material-icons');
         _fullScreenButton.textContent = 'fullscreen';
         _fullScreenButton.title = this.options.translations.fullscreen;
         _controls.appendChild(_fullScreenButton);

         this._fullScreenButton = _fullScreenButton;
      }
   }

   setupEvents() {
      const me = this;

      this._playButton.addEventListener('click', function (e) {
         if (me._video.paused || me._video.ended) {
            me._video.play();
         } else {
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

      const onCueEnter = function (this: any) {
         me._cues.textContent = this.text;
         me._cues.classList.remove('hidden');
      };

      const onCueExit = function () {
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
            for (let i = 0; i < me.cues.length; i++) {
               let cue = me.cues[i];
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
         } else {
            me._volumeSlider.value = me._video.volume.toString();
            me._volumeButton.title = me.options.translations.mute;
            if (me.volume > 0.5) {
               me._volumeButton.textContent = 'volume_up';
            } else {
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
            for (let i = 0; i < this.buffered.length; i++) {
               const bufferRangeIndex = this.buffered.length - 1 - i;
               const bufferStart = this.buffered.start(bufferRangeIndex);
               const bufferEnd = this.buffered.end(bufferRangeIndex);
               if (bufferStart <= this.currentTime) {
                  me._bufferBar.value = (bufferEnd / this.duration) * 100;
                  break;
               }
            }
         }
      });

      this._video.addEventListener('click', () => {
         if (me._video.paused || me._video.ended) {
            me._video.play();
         } else {
            me._video.pause();
         }
         this.userActive = true;
      });

      this._container.addEventListener('mousemove', () => this.userActive = true);
      
      this.userActiveCheck = window.setInterval(() => {
            if (!this.userActive) {
               return;
            }

            this.userActive = false;

            this.showControls();

            clearTimeout(this.userInactiveTimeout);

            this.userInactiveTimeout = window.setTimeout(() => {
               if (!this.userActive) {
                  this.hideControls();
                  
                  const _activeElement = document.activeElement;
                  if (_activeElement && _activeElement.parentElement == this._controls) {
                     // We put focus on the video element so hotkeys work again after a control bar button is pressed
                     // and the user is inactive again.
                     this._video.focus();
                  }
               }
            }, 2000);


      }, 250);

      this._progressBar.addEventListener('click', function (event) {
         const target = event.target as HTMLElement;
         const rect = target.getBoundingClientRect();
         const pos = (event.clientX - rect.left) / this.offsetWidth;
         me._video.currentTime = pos * me._video.duration;
      });

      if (this.fullScreenEnabled) {
         this._fullScreenButton.addEventListener('click', () => me.toggleFullScreen());

         document.addEventListener('fullscreenchange', () => this.handleFullScreenChange());
         document.addEventListener('webkitfullscreenchange', () => this.handleFullScreenChange());
      }

      if (this.options.sources.length > 1) {
         this._qualityOptions.forEach(function (_qualityOption: HTMLElement) {
            _qualityOption.addEventListener('click', function () {
               const newQuality = _qualityOption.dataset.quality;
               const currentQuality = me.quality;

               if (!newQuality || newQuality === currentQuality) {
                  return;
               }

               me._qualityOptions.forEach(function (_qualityOption: HTMLElement) {
                  _qualityOption.classList.remove('active');
               });
               _qualityOption.classList.add('active');

               const currentTime = me._video.currentTime;

               const newSource = me.options.sources.find(source => newQuality === source.quality);
               if (!newSource) {
                  return;
               }

               newSource.sources.forEach((source, index) => {
                  const _source = me._sources[index];
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
         this._deeplinkButton.addEventListener('click', () => {
            me.copyToClipboard(me.options.deeplink, me._deeplinkButton);
         });
      }

      if (this.options.subtitles) {
         this._captionsButton.addEventListener('click', function () {
            const wasEnabled = me._container.dataset.captions;
            me._container.dataset.captions = !wasEnabled;
            this.classList.toggle('material-icons');
            this.classList.toggle('material-icons-outlined');
            me._cuesContainer.classList.toggle('hidden');
            if (wasEnabled) {
               this.title = me.options.translations.showSubtitles;
            } else {
               this.title = me.options.translations.hideSubtitles;
            }
         });
      }

      if (this.options.closeCallback) {
         this._closeButton.addEventListener('click', () => {
            this.options.closeCallback?.apply(this);
         });
      }

      this._video.addEventListener('keyup', event => {
         const { key } = event;
         
         event.preventDefault();
         event.stopPropagation();

         switch (key) {
            // Space bar allows to pause/resume the video
            case ' ':
               this.userActive = true;
               if (this._video.paused) {
                  this._video.play();
               } else {
                  this._video.pause();
               }
               break;
            // Escape leaves the fullscreen when currently enabled
            case 'Escape':
               this.userActive = true;
               if (this.fullScreenEnabled && this.isFullScreen()) {
                  this.toggleFullScreen();
               }
               break;
            // Left Arrow skips 10 seconds into the past
            case 'ArrowLeft':
               this.userActive = true;
               this._video.currentTime -= 10;
               break;
            // Right Arrow skips 10 seconds into the future
            case 'ArrowRight':
               this.userActive = true;
               this._video.currentTime += 10;
               break;
            // Down Arrow decreases the volume by 5%
            case 'ArrowDown':
               this.userActive = true;
               if (this._video.volume > 0) {
                  let currentVolume = Math.round((this._video.volume + Number.EPSILON) * 100);
                  this.volume = (currentVolume - 5) / 100;
                  this._video.volume = this.volume;
                  if (this.volume === 0) {
                     // Also switch on mute when we reach 0% volume
                     this._video.muted = true;
                  }
                  this._volumeSlider.value = this.volume.toString();
               }
               break;
            // Up Arrow increases the volume by 5%
            case 'ArrowUp':
               this.userActive = true;
               if (this._video.volume < 1) {
                  let currentVolume = Math.round((this._video.volume + Number.EPSILON) * 100);
                  this.volume = (currentVolume + 5) / 100;
                  this._video.volume = this.volume;
                  // Unmute if we previously were muted
                  this._video.muted = false;
                  this._volumeSlider.value = this.volume.toString();
               }
               break;
         }
      });
      
      return true;
   }

   getSourcesForQuality(quality: string): VideoQuality | null {
      for (let source of this.options.sources) {
         if (source.quality === quality) {
            return source;
         }
      }
      return null;
   }

   formatTime(seconds: number) {
      let hourComponent = Math.floor(seconds / 3600);
      let minuteComponent = Math.floor((seconds - (hourComponent * 3600)) / 60);
      let secondComponent = Math.floor(seconds - (hourComponent * 3600) - (minuteComponent * 60));

      let timer = this.toTimerComponent(minuteComponent) + ':' + this.toTimerComponent(secondComponent);

      if (this.totalSeconds >= (60 * 60)) {
          // Include the hours in both timers when the video is at least an hour long
         return this.toTimerComponent(hourComponent) + ':' + timer;
      }
      
      return timer;
   }

   toTimerComponent(value: number) {
      return value < 10 ? "0" + value : value;
   }

   updateTimer() {
      this._timer.textContent = this.formatTime(this.playedSeconds) + ' / ' + this.formatTime(this.totalSeconds);
   }

   writeToLocalStore(name: string, value: string) {
      try {
         if (window.localStorage) {
            window.localStorage.setItem('cinematic-js-' + name, value);
         }
      } catch (e) {
         console.log('CinematicJS: Cannot write to local store', { name: name, value: value, error: e });
      }
   }

   readFromLocalStore(name: string): string | null {
      try {
         if (window.localStorage) {
            return window.localStorage.getItem('cinematic-js-' + name);
         }
      } catch (e) {
         console.log('CinematicJS: Cannot read from local store', { name: name, error: e });
      }
      return null;
   }

   toggleFullScreen() {
      if (document.fullscreenElement) {
         document.exitFullscreen();
      } else if (document.webkitFullscreenElement) {
         // Need this to support Safari
         document.webkitExitFullscreen();
      } else if (this._container.webkitRequestFullscreen) {
         // Need this to support Safari
         this._container.webkitRequestFullscreen();
      } else {
         this._container.requestFullscreen();
      }
   }
   
   handleFullScreenChange() {
      if (this.isFullScreen()) {
         this._container.dataset.fullscreen = true;
         this._fullScreenButton.textContent = 'fullscreen_exit';
         this._fullScreenButton.title = this.options.translations.exitFullscreen;
      } else {
         this._container.dataset.fullscreen = false;
         this._fullScreenButton.textContent = 'fullscreen';
         this._fullScreenButton.title = this.options.translations.fullscreen;
      }
   }

   showControls() {
      this._header.classList.remove('hidden');
      this._controls.classList.remove('hidden');
   }

   hideControls() {
      if (this._video.paused) {
         return;
      }

      this._header.classList.add('hidden');
      this._controls.classList.add('hidden');
   }

   isFullScreen() {
      return document.fullscreenElement || document.webkitFullscreenElement;
   }

   copyToClipboard(text: string, _element: HTMLElement) {
      /*
       * inspired by clipboard.js v1.5.12
       * https://zenorocha.github.io/clipboard.js
       *
       * Licensed MIT © Zeno Rocha
       */
      const fakeElem = document.createElement('textarea');
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

      const range = document.createRange();
      range.selectNodeContents(fakeElem);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      fakeElem.setSelectionRange(0, text.length);

      if (document.execCommand('copy') && typeof _element !== 'undefined') {
         _element.classList.add('copied');
         setTimeout(function () {
            _element.classList.remove('copied');
         }, 2000);
      }
      document.body.removeChild(fakeElem);

      /* Try alternative */
      const copy = function (event: ClipboardEvent) {
         if (event.clipboardData) {
            event.clipboardData.setData('text/plain', text);
         } else if ((<any>window).clipboardData) {
            (<any>window).clipboardData.setData('Text', text);
         }
         event.preventDefault();
      }

      window.addEventListener('copy', copy);
      document.execCommand('copy');
      window.removeEventListener('copy', copy);
   }
}
