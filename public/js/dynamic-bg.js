/**
 * Dynamic Background Image Switcher
 * 
 * This script provides dynamic background image switching functionality
 * for the homepage carousel.
 */

// Configuration
const DynamicBG = {
  // Default interval in milliseconds (10 seconds)
  interval: 10000,
  
  // Default transition duration in milliseconds
  transitionDuration: 1000,
  
  // List of background images (will be populated from config or carousel)
  backgrounds: [],
  
  // Current background index
  currentIndex: 0,
  
  // Timer reference
  timer: null,
  
  // Whether auto-switching is enabled
  autoSwitch: true,
  
  // Initialize the dynamic background
  init: function(options) {
    // Merge options with defaults
    if (options) {
      this.interval = options.interval || this.interval;
      this.transitionDuration = options.transitionDuration || this.transitionDuration;
      this.backgrounds = options.backgrounds || this.backgrounds;
      this.autoSwitch = options.autoSwitch !== undefined ? options.autoSwitch : this.autoSwitch;
    }
    
    // If no backgrounds provided in options, get them from carousel
    if (this.backgrounds.length === 0) {
      this.getBackgroundsFromCarousel();
    }
    
    // Set up control panel event listeners
    this.setupControlPanel();
    
    // Start the background switching if autoSwitch is enabled
    if (this.autoSwitch) {
      this.start();
    }
    
    // Update status display
    this.updateStatus();
  },
  
  // Get background images from the existing carousel
  getBackgroundsFromCarousel: function() {
    const carouselItems = document.querySelectorAll('.carousel-item .view');
    this.backgrounds = [];
    
    carouselItems.forEach(item => {
      const style = window.getComputedStyle(item);
      const backgroundImage = style.backgroundImage;
      
      // Extract the URL from the background-image CSS property
      if (backgroundImage && backgroundImage !== 'none') {
        const url = backgroundImage.replace(/url\(['"]?(.*?)['"]?\)/i, '$1');
        this.backgrounds.push(url);
      }
    });
    
    console.log('DynamicBG: Found', this.backgrounds.length, 'background images');
  },
  
  // Start automatic background switching
  start: function() {
    // Clear any existing timer
    if (this.timer) {
      clearTimeout(this.timer);
    }
    
    // Start the timer
    if (this.autoSwitch && this.backgrounds.length > 1) {
      this.timer = setTimeout(() => {
        this.next();
      }, this.interval);
    }
    
    console.log('DynamicBG: Started with interval', this.interval);
    this.updateStatus();
  },
  
  // Stop automatic background switching
  stop: function() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      console.log('DynamicBG: Stopped');
    }
    this.updateStatus();
  },
  
  // Switch to next background
  next: function() {
    if (this.backgrounds.length <= 1) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.backgrounds.length;
    this.applyBackground();
    
    // Restart timer for next switch if autoSwitch is enabled
    if (this.autoSwitch) {
      this.start();
    }
  },
  
  // Switch to previous background
  prev: function() {
    if (this.backgrounds.length <= 1) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.backgrounds.length) % this.backgrounds.length;
    this.applyBackground();
    
    // Restart timer for next switch if autoSwitch is enabled
    if (this.autoSwitch) {
      this.start();
    }
  },
  
  // Apply background to all carousel items with transition effect
  applyBackground: function() {
    const carouselItems = document.querySelectorAll('.carousel-item .view');
    
    carouselItems.forEach((item, index) => {
      // Add transition class
      item.classList.add('dynamic-bg-transition');
      
      // Apply new background
      item.style.backgroundImage = `url('${this.backgrounds[this.currentIndex]}')`;
      
      // Remove transition class after animation completes
      setTimeout(() => {
        item.classList.remove('dynamic-bg-transition');
      }, this.transitionDuration);
    });
    
    // Update carousel indicators if they exist
    this.updateCarouselIndicators();
    
    console.log('DynamicBG: Applied background', this.currentIndex);
  },
  
  // Update carousel indicators to match current background
  updateCarouselIndicators: function() {
    // Remove active class from all indicators
    const indicators = document.querySelectorAll('.carousel-indicators li');
    indicators.forEach((indicator, index) => {
      if (index === this.currentIndex) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    });
    
    // Update active carousel item
    const items = document.querySelectorAll('.carousel-item');
    items.forEach((item, index) => {
      if (index === this.currentIndex) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  },
  
  // Set specific background by index
  setBackground: function(index) {
    if (index >= 0 && index < this.backgrounds.length) {
      this.currentIndex = index;
      this.applyBackground();
      // Restart timer if autoSwitch is enabled
      if (this.autoSwitch) {
        this.start();
      }
    }
  },
  
  // Update status display in control panel
  updateStatus: function() {
    const statusElement = document.getElementById('dynamicBgStatus');
    if (statusElement) {
      if (this.backgrounds.length <= 1) {
        statusElement.textContent = '状态: 无背景图片';
      } else if (this.autoSwitch) {
        statusElement.textContent = `状态: 运行中 (第 ${this.currentIndex + 1}/${this.backgrounds.length} 张)`;
      } else {
        statusElement.textContent = `状态: 已暂停 (第 ${this.currentIndex + 1}/${this.backgrounds.length} 张)`;
      }
    }
  },
  
  // Set up event listeners for the control panel
  setupControlPanel: function() {
    // Toggle button
    const toggleButton = document.getElementById('dynamicBgControlToggle');
    const controlContent = document.getElementById('dynamicBgControlContent');
    const closeButton = document.getElementById('dynamicBgControlClose');
    
    if (toggleButton && controlContent) {
      toggleButton.addEventListener('click', () => {
        controlContent.classList.toggle('collapsed');
      });
      
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          controlContent.classList.add('collapsed');
        });
      }
    }
    
    // Apply button
    const applyButton = document.getElementById('dynamicBgApplyBtn');
    if (applyButton) {
      applyButton.addEventListener('click', () => {
        this.applySettings();
      });
    }
    
    // Previous button
    const prevButton = document.getElementById('dynamicBgPrevBtn');
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        this.prev();
      });
    }
    
    // Next button
    const nextButton = document.getElementById('dynamicBgNextBtn');
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        this.next();
      });
    }
    
    // Auto switch checkbox
    const autoSwitchCheckbox = document.getElementById('dynamicBgAutoSwitch');
    if (autoSwitchCheckbox) {
      autoSwitchCheckbox.addEventListener('change', (e) => {
        this.autoSwitch = e.target.checked;
        if (this.autoSwitch) {
          this.start();
        } else {
          this.stop();
        }
      });
    }
    
    // Initialize form values
    this.initializeFormValues();
  },
  
  // Initialize form values from current settings
  initializeFormValues: function() {
    const intervalInput = document.getElementById('dynamicBgInterval');
    const transitionInput = document.getElementById('dynamicBgTransition');
    const autoSwitchCheckbox = document.getElementById('dynamicBgAutoSwitch');
    
    if (intervalInput) {
      intervalInput.value = Math.floor(this.interval / 1000);
    }
    
    if (transitionInput) {
      transitionInput.value = this.transitionDuration;
    }
    
    if (autoSwitchCheckbox) {
      autoSwitchCheckbox.checked = this.autoSwitch;
    }
  },
  
  // Apply settings from control panel
  applySettings: function() {
    const intervalInput = document.getElementById('dynamicBgInterval');
    const transitionInput = document.getElementById('dynamicBgTransition');
    const autoSwitchCheckbox = document.getElementById('dynamicBgAutoSwitch');
    
    // Update interval
    if (intervalInput) {
      const intervalValue = parseInt(intervalInput.value, 10);
      if (!isNaN(intervalValue) && intervalValue > 0) {
        this.interval = intervalValue * 1000;
      }
    }
    
    // Update transition duration
    if (transitionInput) {
      const transitionValue = parseInt(transitionInput.value, 10);
      if (!isNaN(transitionValue) && transitionValue >= 100) {
        this.transitionDuration = transitionValue;
      }
    }
    
    // Update auto switch
    if (autoSwitchCheckbox) {
      this.autoSwitch = autoSwitchCheckbox.checked;
    }
    
    // Apply changes
    if (this.autoSwitch) {
      this.start();
    } else {
      this.stop();
    }
    
    // Update status display
    this.updateStatus();
  }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the homepage (has carousel)
  if (document.querySelector('#site-header')) {
    // Try to get background images from window object (set in template)
    let backgrounds = [];
    if (typeof window.dynamicBackgrounds !== 'undefined' && Array.isArray(window.dynamicBackgrounds)) {
      backgrounds = window.dynamicBackgrounds;
    }
    
    // If no backgrounds provided, use default external images
    if (backgrounds.length === 0) {
      backgrounds = [
        'https://picsum.photos/1920/1080?random=1',
        'https://picsum.photos/1920/1080?random=2',
        'https://picsum.photos/1920/1080?random=3'
      ];
    }
    
    // Initialize with settings
    DynamicBG.init({
      interval: 10000, // 10 seconds
      transitionDuration: 1000, // 1 second
      backgrounds: backgrounds,
      autoSwitch: true
    });
    
    // Also hook into carousel events to sync with manual navigation
    const carousel = document.querySelector('#site-header');
    
    if (carousel) {
      // When carousel slide changes, update our index
      carousel.addEventListener('slide.bs.carousel', function(event) {
        DynamicBG.stop(); // Stop automatic switching during manual navigation
      });
      
      carousel.addEventListener('slid.bs.carousel', function(event) {
        // Update our index to match carousel
        const activeItem = document.querySelector('.carousel-item.active');
        const items = Array.from(document.querySelectorAll('.carousel-item'));
        const index = items.indexOf(activeItem);
        
        if (index !== -1) {
          DynamicBG.currentIndex = index;
        }
        
        // Restart automatic switching after a delay
        setTimeout(() => {
          if (DynamicBG.autoSwitch) {
            DynamicBG.start();
          }
        }, 5000); // Wait 5 seconds after manual navigation before resuming auto-switching
        
        // Update status
        DynamicBG.updateStatus();
      });
    }
  }
});

// Add CSS for transition effect
const dynamicBGCSS = `
.dynamic-bg-transition {
  transition: background-image ${DynamicBG.transitionDuration}ms ease-in-out !important;
}
`;

// Inject CSS
const styleElement = document.createElement('style');
styleElement.textContent = dynamicBGCSS;
document.head.appendChild(styleElement);