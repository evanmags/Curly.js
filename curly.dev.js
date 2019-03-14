// full dev bundle with errors written

const curly = {
  // the only truely global variable in Curly.js is this array,
  // which will hold a reference of every element rendered to the page
  elements: [],

  // quick reimplementation of React.createElement(e, p, c) for jsx use without React loaded...
  // does not handle functions from jsx well (if at all in some cases)
  // need to change the Babel pragma for jsx if you want to use this
  createElement(element, props, children) {
    //check to see if element is defined as a function
    if (typeof element === "function") {
      props = {
        ...props,
        children: [children] || ""
      };
      //return the function
      return element(props);
    } else {
      return (obj = {
        [element]: props || {},
        has: [children]
      });
    }
  },

  //*** Helper Functions begin ***//

  // build/render/update helpers
  createDOMSelector(obj) {
    const key = Object.keys(obj)[0];
    const attrs = obj[key];
    if (attrs.id) {
      select = `${key}#${attrs.id}`;
    } else if (attrs.classList) {
      select = `${key}.${attrs.classList.split(" ").join(".")}`;
    }
  },
  selectElement(ele) {
    return (
      ele.DOMelement || document.querySelector(curly.createDOMSelector(ele))
    );
  },
  resetInterval(ele) {
    //check for a set interval
    if (ele.int) {
      // clear it
      clearInterval(ele.int);
      // open it for a new interval
      ele.int = false;
    }
  },
  clearChildIntervals(ele) {
    // loop through has object
    ele.has.forEach(e => {
      curly.resetInterval(e);
    });
  },
  // remove listeners from element
  removeListeners(ele) {
    for (event in ele.events) {
      ele.DOMelement.removeEventListener(event, ele.events[event]);
    }
  },
  removeElement(ele) {
    curly.resetInterval(ele);
    curly.removeListeners(ele);
    ele.DOMelement.remove();
    ele.DOMelement = null;
  },

  // takes in an array of objects and sorts by key
  sortObjs(arr) {
    return arr.sort((a, b) => {
      return Object.keys(a)[0] > Object.keys(b)[0] ? 1 : -1;
    });
  },

  // style function helpers
  createNewStyleSheet(){
    console.info('Creating new StyleSheet: #CurlyJS_styles')
    //create a blank style tag
    const styleEle = document.createElement("style");
    styleEle.id = "CurlyJS_styles";

    //add to document
    document.head.appendChild(styleEle);

    return styleEle.sheet;
  },
  createCSSSelector(element) {
    //requires element tag object to be first key:value in obj
    for (var key in element) {
      // creates selector with preference set as class>id>tag
      if (element[key].classList) {
        return (selector = `${key}.${element[key].classList
          .split(" ")
          .join(".")}`);
      } else if (element[key].id) {
        return (selector = `${key}#${element[key].id}`);
      } else {
        console.group('Selector Creation Warning')
        console.warn(`Curly created a generic tag selector: ${key} \n This could cause unwanted effects in styling. \n Please add a more specific selector like class or id to your component. \n Or place style in the global styles object.`)
        console.groupEnd('Selector Creation Warning')
        return (selector = `${key}`);
      }
    }
  },
  // takes a css style object and creates a string
  // with selector and rules to append to the stylesheet
  createRuleString(obj) {
    if (obj.CSSselector) return obj.CSSselector;
    // create base string in correct scope
    ruleStr = ``;

    // loop through and append each rule as string to base rule string
    for (let rule in obj) {
      if (rule !== "psudo" || rule !== 'updated') {
        ruleStr += ` ${rule.replace(/_/g, "-")}: ${String(obj[rule]).replace(
          /_/g,
          "-"
        )};`;
      }
    }
    return ruleStr;
  },
  //takes a stylesheet, a selector, and a string of rules
  appendCSSRules(sheet, selector, ruleStr) {
    //insert selectors with rules to the end of the sheet.
    sheet.insertRule(`${selector} { ${ruleStr} }`, sheet.cssRules.length);
  },
  addToStyleSheet(selector, styleObj, styleSheet) {
    // create rule string
    let ruleStr = curly.createRuleString(styleObj);
    // append to sheet
    curly.appendCSSRules(styleSheet, selector, ruleStr);
  },
  removeFromStyleSheet(selector, styleObj, styleSheet) {
    for (var index in styleSheet.rules) {
      if ( styleObj.updated && styleSheet.rules[index].selectorText === selector ) {
        console.warn(`Deleting rule from stylesheet: \n ${styleSheet.rules[index].cssText};\n This rule has been updated.`)
        styleSheet.deleteRule(index);
      }
    }
  },
  updateStyleSheet(selector, styleObj, styleSheet) {
    if(styleObj.updated){
      curly.removeFromStyleSheet(selector, styleObj, styleSheet);
      curly.addToStyleSheet(selector, styleObj, styleSheet);
      styleObj.updated = false;
    }
  },

  //*** Production objects and functions begin ***//
  // constructor object that is applied to all non-text-only componants
  Component: {
    // called on 'has' change
    // can also be called at will with other functions
    update() {
      this.DOMelement.innerHTML = "";

      const parent = curly.selectElement(this);

      this.has.forEach(child => {
        curly.render(child, parent);
      });
    },

    //getter function for has array
    getHas() {
      return this.has;
    },

    //setter function for has array
    setHas(arr) {
      curly.clearChildIntervals(this);
      // sets value and forces update
      this.has = arr;
      this.update();
    },

    // insert an item at a specific point in the has array
    addHas(ele, i) {
      if (!this.has.includes(ele)) {
        this.has.splice(i, 0, ele);
        if (i < this.has.length - 1) {
          curly.style(ele);
          const sibling = this.has[i + 1].DOMelement;
          sibling.parentNode.insertBefore(curly.build(ele), sibling);
        } else {
          curly.render(ele, this.DOMelement);
        }
      }
    },

    // remove a specific item
    removeHas(ele) {
      if (this.has.includes(ele)) {
        this.has.splice(this.has.indexOf(ele), 1);
        curly.removeElement(ele);
      }
    },

    // update styles after changing
    //  pass in parameters as {property: value},
    setStyle(stylesObj, psudo = false) {
      if (!this.style) {
        this.style = {};
      }
      if(!psudo){
        this.style = Object.assign(this.style, stylesObj)
        this.style['updated'] = true;
      } else {
        this.style.psudo[psudo] = Object.assign(this.style.psudo[psudo], stylesObj)
        this.style.psudo[psudo]['updated'] = true;
      } 
      
      curly.style(this);
    }
  },
  //  physical construction function creates a DOM element
  build(l) {
    let newDOMelement;
    // create element
    if (typeof l === "string") {
      return (newDOMelement = document.createTextNode(l));
    } else if (typeof l === "object") {
      Object.assign(l, curly.Component);

      for (var tag in l) {
        //create element'
        try {
          newDOMelement = document.createElement(tag);
        } catch {
          console.group('Element creation error')
          console.error(`${tag} is not a valid html tag at:`)
          console.error(l)
          console.groupEnd('Element creation error')
        }


        l.DOMelement = newDOMelement;

        // loop through attribute object
        for (var a in l[tag]) {
          newDOMelement[a] = l[tag][a];
        }

        break;
      }

      curly.elements = curly.elements.filter(ele => {
        return ele.DOMelement !== newDOMelement;
      });

      curly.elements.push(l);

      //add child elements
      if (l.has) {
        l.has.forEach(i => {
          if (typeof i === "string") {
            newDOMelement.appendChild(document.createTextNode(i));
          } else if (typeof i === "object") {
            curly.render(i, newDOMelement);
          }
        });
      }

      // add events
      for (let key in l.events) {
        try {
          newDOMelement.addEventListener(key, l.events[key]);
        } catch (error) {
          console.group("Error in Events object");
          console.error(
            "One or more of the keys in the events object is not a function at:"
          );
          console.error(l);
          console.groupEnd("Error in Events object");
        }
      }

      // start timers
      if (!l.int) {
        for (let key in l.timers) {
          try {
            l.timers[key]();
          } catch (error) {
            console.group("Error in Timers object");
            console.error(
              "One or more of the keys in the timers object is not a function at:"
            );
            console.error(l);
            console.groupEnd("Error in Timers object");
          }
        }
      }
    }

    return newDOMelement;
  },
  //  styles and places element
  render(ele, locale, styles = {}) {
    curly.style(ele, styles);
    // locates parent and places built element inside
    locale.appendChild(curly.build(ele));
  },

  //*** Styling function
  //this is the main styling fucntion.
  //pass in your styles object and it will create a stylesheet and append it to the page
  style(element, styleObj) {
    // bump out if no style object is in element
    if (typeof element === "string" || !element.style) {
      return;
    }

    // create variable in scope for stylesheet
    let styleSheet,
      keys = [];

    //check if there is already a stylesheet
    try {
      styleSheet = document.querySelector("#CurlyJS_styles").sheet;
    } catch {
      // create and access style sheet
      styleSheet = curly.createNewStyleSheet()

      //add rules from style object
      for (var selector in styleObj) {
        curly.addToStyleSheet(selector, styleObj[selector], styleSheet);
      }
    }

    // if selector was not already created for this element, make one
    if (!element.CSSselector) {
      element.CSSselector = curly.createCSSSelector(element);
    }

    // push all selectors into an array
    for (var key in styleSheet.cssRules) {
      keys.push(styleSheet.cssRules[key].selectorText);
    }

    // if selector is not already in style sheet proceed.
    if (!keys.includes(element.CSSselector)) {
      curly.addToStyleSheet(element.CSSselector, element.style, styleSheet);

      if (element.style.psudo) {
        // loop through psudo elements if they are present
        for (var psudo in element.style.psudo) {
          curly.addToStyleSheet(
            element.CSSselector + psudo,
            element.style.psudo[psudo],
            styleSheet
          );
        }
      }
    } else {
      curly.updateStyleSheet(element.CSSselector, element.style, styleSheet);
      if (element.style.psudo) {
        for (var psudo in element.style.psudo) {
          curly.updateStyleSheet(
            element.CSSselector + psudo,
            element.style.psudo[psudo],
            styleSheet
          );
        }
      }
    }
  },

  //*** routing object
  // router for internal navigation
  router: {
    get(path, callback) {
      this.paths[`${path.replace(/[#/]/, "")}`] = callback;
    },
    paths: {},
    run() {
      window.location.hash =
        window.location.pathname !== `/`
          ? window.location.pathname.replace(`/`, "#")
          : "#home";

      window.onhashchange = function() {
        const h = window.location.hash.replace(/[#/]/, "");
        window.scrollTo(0, 0);
        if (curly.router.paths[h]) {
          window.history.replaceState({}, h, `/${h}`);
          return curly.router.paths[h]();
        }
      };

      window.onpopstate = function(e) {
        if (!window.location.hash) {
          const p = window.location.pathname.replace(/[#/]/, "");
          window.scrollTo(0, 0);
          return curly.router.paths[p]
            ? curly.router.paths[p]()
            : curly.router.paths.home();
        }
      };
    }
  },

  //*** JSON functions for prep and parse
  // JSON prep functions for development,
  // build your app with js objects then transpile to json for shiping.
  functionsToJSON(obj) {
    for (var key in obj) {
      if (typeof obj[key] === "function") {
        obj[key] = `${obj[key]}`;
      }
    }
    return obj;
  },
  transpileToJSON(obj) {
    [obj, obj.events, obj.timers].forEach(i => {
      if (i) {
        return curly.functionsToJSON(i);
      }
    });
    if (obj.has) {
      obj.has.forEach(has => {
        curly.functionsToJSON(has);
        if (has.has) {
          curly.transpileToJSON(has);
        }
      });
    } else {
      for (var key in obj) {
        curly.transpileToJSON(obj[key]);
      }
    }
    return JSON.stringify(obj);
  },

  // JSON processing functions for production,
  // call your app with AJAX to get JSON then transpile to JS objects.
  functionsFromJSON(obj) {
    for (var key in obj) {
      if (typeof obj[key] === "string" && obj[key].includes("function")) {
        obj[key] = eval(`(${obj[key].replace("\n", "")})`);
      }
    }
    return obj;
  },
  transpileFromJSON(obj) {
    [obj, obj.events, obj.timers].forEach(i => {
      if (i) {
        return curly.functionsFromJSON(i);
      }
    });
    if (obj.has) {
      obj.has.forEach(has => {
        curly.functionsFromJSON(has);
        if (has.has) {
          curly.transpileFromJSON(has);
        }
      });
    } else {
      for (var key in obj) {
        curly.transpileFromJSON(obj[key]);
      }
    }
    Object.assign(obj, curly.Component);
    return obj;
  }
};
