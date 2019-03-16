// full dev bundle with errors written

const curly = {
  // quick reimplementation of React.createElement(e, p, c) for jsx use without React loaded...
  // does not handle functions from jsx well (if at all in some cases)
  // need to change the Babel pragma for jsx if you want to use this
  createElement(element, props, children) {
    //check to see if element is defined as a function
    if (typeof element === "function") {
      // transform props into an object that contains child elements 
      props = {
        ...props,
        children: [children] || ""
      };
      //call the function passing in new props object
      return element(props);
    } else {
      // build an object that is recognizeable to curly
      return { [element]: props || {}, has: [children] };
    }
  },

  //*** Helper Functions begin ***//

  // build/render/update helpers
  createDOMSelector(obj) {
    // get the first key from the object
    const key = Object.keys(obj)[0];
    // get the attributes of said object
    const attrs = obj[key];
    // choose most specific selector
    if (attrs.id) {
      return `${key}#${attrs.id}`;
    } else if (attrs.classList) {
      return `${key}.${attrs.classList.split(" ").join(".")}`;
    }
  },
  selectElement(ele) {
    // prefer an already selected element to creating a new selector
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
      // reset intervals
      curly.resetInterval(e);
    });
  },
  // remove listeners from element
  removeListeners(ele) {
    for (let event in ele.events) {
      try{
        ele.DOMelement.removeEventListener(event, ele.events[event]);
      } catch (error) {
        console.group("error removing evnet listener")
        console.error("Could not remove event listener: " + event);
        console.error("listener was either not a function or was an anonymous function.")
        console.groupEnd("error removing evnet listener")
      }

    }
  },
  removeElement(ele) {
    // destroys all instances of the element.
    curly.resetInterval(ele);
    curly.removeListeners(ele);
    ele.DOMelement.remove();
    ele.DOMelement = null;
  },

  // takes in an array of objects and sorts by key
  // unused in code at the moment, may be helpful for retreving stylesheet in a readable manner.
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
        //preferrs class over id or generic tag.
        //uses first class so that utility classes can be applied through ?: statements in the object.
        return `${key}.${element[key].classList.split(" ")[0]}`;
      } else if (element[key].id) {
        return `${key}#${element[key].id}`;
      } else {
        //least preferred, should use global style object instead.
        console.group('Selector Creation Warning')
        console.warn(`Curly created a generic tag selector: ${key} \n This could cause unwanted effects in styling. \n Please add a more specific selector like class or id to your component. \n Or place style in the global styles object.`)
        console.groupEnd('Selector Creation Warning')
        return `${key}`;
      }
    }
  },
  // takes a css style object and creates a string
  // with selector and rules to append to the stylesheet
  createRuleString(obj) {
    //might be unnecessary, doublechecks that object being passed in is the styles object.
    if (obj.CSSselector) return obj.CSSselector;
    // create base string in correct scope
    let ruleStr = ``;

    // loop through and append each rule as string to base rule string
    for (let rule in obj) {
      // check for reserved words
      if (rule !== "psudo" || rule !== 'updated') {
        ruleStr += ` ${rule.replace(/_/g, "-")}: ${String(obj[rule]).replace(/_/g, "-")};`;
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
      // make sure that the update flag is present, search for match in selector text
      if ( styleObj.updated && styleSheet.rules[index].selectorText === selector ) {
        console.warn(`Deleting rule from stylesheet: \n ${styleSheet.rules[index].cssText};\n This rule has been updated.`)
        styleSheet.deleteRule(index);
      }
    }
  },
  updateStyleSheet(selector, styleObj, styleSheet) {
    // check update flag, this is checked multiple times...
    if(styleObj.updated){
      curly.removeFromStyleSheet(selector, styleObj, styleSheet);
      curly.addToStyleSheet(selector, styleObj, styleSheet);
      // remove flag
      styleObj.updated = false;
    }
  },

  //*** Production objects and functions begin ***//
  // constructor object that is applied to all non-text-only componants
  Component: {
    // called on 'has' change
    // can also be called at will with other functions
    update() {
      // clear the element
      curly.selectElement(this).innerHTML = "";

      // use because 'this' referrs to the window in the foreach loop
      const parent = curly.selectElement(this);

      // render all children
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
      // checks to makesure element is not in has
      if (!this.has.includes(ele)) {
        // splices into array
        this.has.splice(i, 0, ele);
        if (i < this.has.length - 1) {
          // styles and appends before a sibling
          curly.style(ele);
          const sibling = this.has[i + 1].DOMelement;
          sibling.parentNode.insertBefore(curly.build(ele), sibling);
        } else {
          // if it will be last, do standard rendering.
          curly.render(ele, this.DOMelement);
        }
      }
    },

    // remove a specific item
    removeHas(ele) {
      // checks to makesure element is in has
      if (this.has.includes(ele)) {
        // pulls from has
        this.has.splice(this.has.indexOf(ele), 1);
        // removes from existance
        curly.removeElement(ele);
      }
    },

    // update styles after changing
    //  pass in parameters as {property: value},
    setStyle(stylesObj, psudo = false) {
      // create new style object if there isnt one
      if (!this.style) {
        this.style = {};
      }
      // check for psudo selector declairation
      if(!psudo){
        // add styles to style object, raise update flag
        this.style = Object.assign(this.style, stylesObj)
        this.style['updated'] = true;
      } else {
        // add styles to psudostyle object, raise update flag
        this.style.psudo[psudo] = Object.assign(this.style.psudo[psudo], stylesObj)
        this.style.psudo[psudo]['updated'] = true;
      } 
      // restyle element
      curly.style(this);
    }
  },
  //  physical construction function creates a DOM element
  build(l) {
    let newDOMelement;
    // create element
    if (typeof l === "string") {
      // no other rendering needed
      return document.createTextNode(l);
    } else if (typeof l === "object") {
      // add generic componant features
      Object.assign(l, curly.Component);

      for (var tag in l) {
        //create element
        try {
          newDOMelement = document.createElement(tag);
        } catch (error) {
          console.group('Element creation error')
          console.error(`${tag} is not a valid html tag at:`)
          console.error(l)
          console.groupEnd('Element creation error')
        }

        // easyist way to select the element later on
        l.DOMelement = newDOMelement;

        // loop through attribute object
        for (var a in l[tag]) {
          // set attributes on new element
          newDOMelement[a] = l[tag][a];
        }

        break;
      }

      //add child elements
      if (l.has) {
        l.has.forEach(i => {
          if (typeof i === "string") {
            // if child is string, add it in
            newDOMelement.appendChild(document.createTextNode(i));
          } else if (typeof i === "object") {
            // this is the BIG recurrsion, not sure if/how i can remove... or make async
            curly.render(i, newDOMelement);
          }
        });
      }

      // add events
      for (let key in l.events) {
        try {
          // adds event listeners
          newDOMelement.addEventListener(key, l.events[key]);
        } catch (error) {
          // super helpful error IMO
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
            // sets timers
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
    // main styling call; 
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
    } catch (error) {
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
        for (let psudo in element.style.psudo) {
          curly.addToStyleSheet(
            element.CSSselector + psudo,
            element.style.psudo[psudo],
            styleSheet
          );
        }
      }
    } else {
      // same as above but removes then adds updated string
      curly.updateStyleSheet(element.CSSselector, element.style, styleSheet);
      if (element.style.psudo) {
        for (let psudo in element.style.psudo) {
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
  // allows for SPA functionality
  router: {
    // easy way to set routing functions
    get(path, callback) {
      this.paths[`${path.replace(/[#/]/, "")}`] = callback;
    },
    // can also just manipulate this by building a separate object and assigning it to router.paths.
    // routes are visually discriptive, "what is on the page", functions.
    paths: {},
    // main call to use router.
    run(rootPath, homeRoute)  {
      // currently relies on hashlinks and "#home" as the root route.
      // ways to improve this?
      rootPath = rootPath || '';
      window.location.hash =
        window.location.pathname !== rootPath
          ? homeRoute
          : window.location.pathname.replace(`${rootPath}` || "/", '');

      // listen for hash change
      window.onhashchange = function() {
        // pull hash, clean it
        const h = window.location.hash.replace(rootPath, '').replace(/[/#]/g, "");
        // scroll to top of page
        window.scrollTo(0, 0);
        // check for route
        if (curly.router.paths[h]) {
          // if it exists manipulate history and run function
          window.history.replaceState({}, h, `${rootPath}/${h}`);
          return curly.router.paths[h]();
        }
        // if path does not exist, gets treated as regular hashlink
      };

      window.onpopstate = function() {
        // ONLY runs if no hash present.
        if (!window.location.hash) {
          // everythign is the same as above
          // eccept, if path does not exist, routes to home.
          const p = window.location.pathname.replace(`${rootPath}/`, "");
          window.scrollTo(0, 0);
          return curly.router.paths[p]
            ? curly.router.paths[p]()
            : curly.router.paths.home();
        }
      };
    }
  },

  //*********** still in development, use at your own risk ***********//
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
