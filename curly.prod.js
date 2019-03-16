// full prod bundle

const curly = {
  createElement(element, props, children) {
    if (typeof element === "function") {
      props = {
        ...props,
        children: [children] || ""
      };
      return element(props);
    } else {
      return (obj = {
        [element]: props || {},
        has: [children]
      });
    }
  },
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
    if (ele.int) {
      clearInterval(ele.int);
      ele.int = false;
    }
  },
  clearChildIntervals(ele) {
    ele.has.forEach(e => {
      curly.resetInterval(e);
    });
  },
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
  sortObjs(arr) {
    return arr.sort((a, b) => {
      return Object.keys(a)[0] > Object.keys(b)[0] ? 1 : -1;
    });
  },
  createNewStyleSheet(){
    const styleEle = document.createElement("style");
    styleEle.id = "CurlyJS_styles";
    document.head.appendChild(styleEle);
    return styleEle.sheet;
  },
  createCSSSelector(element) {
    for (var key in element) {
      if (element[key].classList) {
        return (selector = `${key}.${element[key].classList
          .split(" ")
          .join(".")}`);
      } else if (element[key].id) {
        return (selector = `${key}#${element[key].id}`);
      } else {
        return (selector = `${key}`);
      }
    }
  },
  createRuleString(obj) {
    if (obj.CSSselector) return obj.CSSselector;
    let ruleStr = ``;
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
  appendCSSRules(sheet, selector, ruleStr) {
    sheet.insertRule(`${selector} { ${ruleStr} }`, sheet.cssRules.length);
  },
  addToStyleSheet(selector, styleObj, styleSheet) {
    let ruleStr = curly.createRuleString(styleObj);
    curly.appendCSSRules(styleSheet, selector, ruleStr);
  },
  removeFromStyleSheet(selector, styleObj, styleSheet) {
    for (var index in styleSheet.rules) {
      if ( styleObj.updated && styleSheet.rules[index].selectorText === selector ) {
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
  Component: {
    update() {
      this.DOMelement.innerHTML = "";
      const parent = curly.selectElement(this);
      this.has.forEach(child => {
        curly.render(child, parent);
      });
    },
    getHas() {
      return this.has;
    },
    setHas(arr) {
      curly.clearChildIntervals(this);
      this.has = arr;
      this.update();
    },
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
    removeHas(ele) {
      if (this.has.includes(ele)) {
        this.has.splice(this.has.indexOf(ele), 1);
        curly.removeElement(ele);
      }
    },
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
  build(l) {
    let newDOMelement;
    if (typeof l === "string") {
      return (newDOMelement = document.createTextNode(l));
    } else if (typeof l === "object") {
      Object.assign(l, curly.Component);
      for (var tag in l) {
        try {
          newDOMelement = document.createElement(tag);
        } catch {}
        l.DOMelement = newDOMelement;
        for (var a in l[tag]) {
          newDOMelement[a] = l[tag][a];
        }
        break;
      }
      if (l.has) {
        l.has.forEach(i => {
          if (typeof i === "string") {
            newDOMelement.appendChild(document.createTextNode(i));
          } else if (typeof i === "object") {
            curly.render(i, newDOMelement);
          }
        });
      }
      for (let key in l.events) {
        try {
          newDOMelement.addEventListener(key, l.events[key]);
        } catch {}
      }
      if (!l.int) {
        for (let key in l.timers) {
          try {
            l.timers[key]();
          } catch {}
        }
      }
    }
    return newDOMelement;
  },
  render(ele, locale, styles = {}) {
    curly.style(ele, styles);
    locale.appendChild(curly.build(ele));
  },
  style(element, styleObj) {
    if (typeof element === "string" || !element.style) {
      return;
    }
    let styleSheet, keys = [];
    try {
      styleSheet = document.querySelector("#CurlyJS_styles").sheet;
    } catch {
      styleSheet = curly.createNewStyleSheet()
      for (var selector in styleObj) {
        curly.addToStyleSheet(selector, styleObj[selector], styleSheet);
      }
    }
    if (!element.CSSselector) {
      element.CSSselector = curly.createCSSSelector(element);
    }
    for (var key in styleSheet.cssRules) {
      keys.push(styleSheet.cssRules[key].selectorText);
    }
    if (!keys.includes(element.CSSselector)) {
      curly.addToStyleSheet(element.CSSselector, element.style, styleSheet);
      if (element.style.psudo) {
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
  router: {
    get(path, callback) {
      this.paths[`${path.replace(/[#/]/, "")}`] = callback;
    },
    paths: {},
    run() {
      window.location.hash = window.location.pathname !== `/` ? window.location.pathname.replace(`/`, '') : "#home";
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
          return curly.router.paths[p] ? curly.router.paths[p]() : curly.router.paths.home();
        }
      };
    }
  },
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
