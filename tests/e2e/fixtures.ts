import { createTauriTest } from '@srsholmes/tauri-playwright'

const baseTest = createTauriTest({
  devUrl: 'http://localhost:1420',
  mcpSocket: '/tmp/tauri-playwright.sock',
})

export const expect = baseTest.expect

export const test = baseTest.test.extend({
  tauriPage: async ({ tauriPage }, use) => {
    tauriPage.setDefaultTimeout(15000);
    if ('window' in tauriPage) {
      const mainPage = tauriPage.window('main')
      mainPage.setDefaultTimeout(15000);
      await use(mainPage)
    } else {
      await use(tauriPage)
    }
  }
})
/**
 * Serialize a string safely into a single-quoted JavaScript string literal.
 * Avoids any double/single quote escapes or raw newline parsing errors in eval.
 */
function toJsString(str: string): string {
  return "'" + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
}

/**
 * Click an element by its aria-label using DOM-level el.click().
 *
 * `@srsholmes/tauri-playwright` translates getByRole('button', { name })
 * into a CSS selector [role="button"][aria-label="<name>"] and dispatches
 * the click via the native Tauri plugin command. On macOS WebKit the native
 * click often does NOT trigger React synthetic event handlers, so navigation
 * buttons silently do nothing.
 *
 * This helper bypasses the native click by running `el.click()` inside the
 * webview's JS context through `page.evaluate()`, which fires a real DOM
 * click event that React's event system picks up correctly.
 */
export async function clickByLabel(page: any, label: string, timeout = 10000) {
  const cssSelector = `[aria-label="${label.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
  const result = await page.evaluate(`
    (async function() {
      try {
        var simulateClick = function(el) {
          var eventNames = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
          eventNames.forEach(function(type) {
            var eventClass = type.startsWith('pointer') ? PointerEvent : MouseEvent;
            var init = {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 0,
              buttons: 1
            };
            if (type.startsWith('pointer')) {
              init.pointerId = 1;
              init.pointerType = 'mouse';
              init.isPrimary = true;
            }
            var ev = new eventClass(type, init);
            el.dispatchEvent(ev);
          });
        };
        var deadline = Date.now() + ${timeout};
        while (Date.now() < deadline) {
          var elements = document.querySelectorAll(${toJsString(cssSelector)});
          for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              var st = getComputedStyle(el);
              if (st.visibility !== 'hidden' && st.display !== 'none') {
                el.scrollIntoView({ block: 'center' });
                simulateClick(el);
                return { success: true };
              }
            }
          }
          await new Promise(function(r) { setTimeout(r, 50); });
        }
        return { success: false, error: 'Timeout: element with aria-label=' + ${toJsString(label)} + ' not found or not visible' };
      } catch (err) {
        return { success: false, error: err.stack || err.message || String(err) };
      }
    })()
  `)
  if (!result.success) {
    throw new Error(result.error)
  }
}

/**
 * Click an element by a CSS selector using DOM-level el.click().
 * Same rationale as clickByLabel — bypasses native Tauri click dispatch.
 */
export async function clickSelector(page: any, selector: string, timeout = 10000) {
  const result = await page.evaluate(`
    (async function() {
      try {
        var simulateClick = function(el) {
          var eventNames = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
          eventNames.forEach(function(type) {
            var eventClass = type.startsWith('pointer') ? PointerEvent : MouseEvent;
            var init = {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 0,
              buttons: 1
            };
            if (type.startsWith('pointer')) {
              init.pointerId = 1;
              init.pointerType = 'mouse';
              init.isPrimary = true;
            }
            var ev = new eventClass(type, init);
            el.dispatchEvent(ev);
          });
        };
        var deadline = Date.now() + ${timeout};
        while (Date.now() < deadline) {
          var elements = document.querySelectorAll(${toJsString(selector)});
          for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            var r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              var st = getComputedStyle(el);
              if (st.visibility !== 'hidden' && st.display !== 'none') {
                el.scrollIntoView({ block: 'center' });
                simulateClick(el);
                return { success: true };
              }
            }
          }
          await new Promise(function(r) { setTimeout(r, 50); });
        }
        return { success: false, error: 'Timeout: element matching ' + ${toJsString(selector)} + ' not found or not visible' };
      } catch (err) {
        return { success: false, error: err.stack || err.message || String(err) };
      }
    })()
  `)
  if (!result.success) {
    throw new Error(result.error)
  }
}

/**
 * Click a button inside a specific card container (matched by containing text).
 * This works for Activate, Edit, Delete, Duplicate buttons inside card context.
 */
export async function clickCardButton(page: any, cardText: string, buttonTitleOrLabel: string, timeout = 10000) {
  const btnSelector = `button[title="${buttonTitleOrLabel.replace(/\\/g, '\\\\').replace(/"/g, '\\')}"], button[aria-label="${buttonTitleOrLabel.replace(/\\/g, '\\\\').replace(/"/g, '\\')}"]`;
  const result = await page.evaluate(`
    (async function() {
      try {
        var simulateClick = function(el) {
          var eventNames = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
          eventNames.forEach(function(type) {
            var eventClass = type.startsWith('pointer') ? PointerEvent : MouseEvent;
            var init = {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 0,
              buttons: 1
            };
            if (type.startsWith('pointer')) {
              init.pointerId = 1;
              init.pointerType = 'mouse';
              init.isPrimary = true;
            }
            var ev = new eventClass(type, init);
            el.dispatchEvent(ev);
          });
        };
        var deadline = Date.now() + ${timeout};
        while (Date.now() < deadline) {
          var cards = document.querySelectorAll('.border-border');
          for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            if (card.textContent && card.textContent.includes(${toJsString(cardText)})) {
              var btn = card.querySelector(${toJsString(btnSelector)});
              if (btn) {
                var r = btn.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                  btn.scrollIntoView({ block: 'center' });
                  simulateClick(btn);
                  return { success: true };
                }
              }
            }
          }
          await new Promise(function(r) { setTimeout(r, 50); });
        }
        return { success: false, error: 'Timeout: button ' + ${toJsString(buttonTitleOrLabel)} + ' inside card containing ' + ${toJsString(cardText)} + ' not found or not visible' };
      } catch (err) {
        return { success: false, error: err.stack || err.message || String(err) };
      }
    })()
  `)
  if (!result.success) {
    throw new Error(result.error)
  }
}

/**
 * Set the value of a textarea or input element using DOM-level value setter.
 * Useful for WebKit where native keyboard input / fill might be buggy or slow.
 */
export async function setTextAreaValue(page: any, selector: string, value: string, timeout = 10000) {
  const result = await page.evaluate(`
    (async function() {
      try {
        var deadline = Date.now() + ${timeout};
        while (Date.now() < deadline) {
          var elements = document.querySelectorAll(${toJsString(selector)});
          for (var i = 0; i < elements.length; i++) {
            var ta = elements[i];
            var r = ta.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
              if (!setter) {
                setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              }
              if (setter) {
                setter.call(ta, ${toJsString(value)});
              } else {
                ta.value = ${toJsString(value)};
              }
              ta.dispatchEvent(new Event('input', { bubbles: true }));
              ta.dispatchEvent(new Event('change', { bubbles: true }));
              return { success: true };
            }
          }
          await new Promise(function(r) { setTimeout(r, 50); });
        }
        return { success: false, error: 'Timeout: element matching ' + ${toJsString(selector)} + ' not found or not visible' };
      } catch (err) {
        return { success: false, error: err.stack || err.message || String(err) };
      }
    })()
  `)
  if (!result.success) {
    throw new Error(result.error)
  }
}

/**
 * Click an element matching text content inside specified selectors (default button/tab).
 * Case-insensitive match, DOM-level click.
 */
export async function clickByText(page: any, text: string, selector = 'button, [role="tab"], [role="button"]', timeout = 10000) {
  const result = await page.evaluate(`
    (async function() {
      try {
        var simulateClick = function(el) {
          var eventNames = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
          eventNames.forEach(function(type) {
            var eventClass = type.startsWith('pointer') ? PointerEvent : MouseEvent;
            var init = {
              bubbles: true,
              cancelable: true,
              view: window,
              button: 0,
              buttons: 1
            };
            if (type.startsWith('pointer')) {
              init.pointerId = 1;
              init.pointerType = 'mouse';
              init.isPrimary = true;
            }
            var ev = new eventClass(type, init);
            el.dispatchEvent(ev);
          });
        };
        var deadline = Date.now() + ${timeout};
        while (Date.now() < deadline) {
          var elements = document.querySelectorAll(${toJsString(selector)});
          for (var i = 0; i < elements.length; i++) {
            var el = elements[i];
            if (el.textContent && el.textContent.toLowerCase().includes(${toJsString(text)}.toLowerCase())) {
              var r = el.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                var st = getComputedStyle(el);
                if (st.visibility !== 'hidden' && st.display !== 'none') {
                  el.scrollIntoView({ block: 'center' });
                  simulateClick(el);
                  return { success: true };
                }
              }
            }
          }
          await new Promise(function(r) { setTimeout(r, 50); });
        }
        return { success: false, error: 'Timeout: element matching text ' + ${toJsString(text)} + ' with selector ' + ${toJsString(selector)} + ' not found or not visible' };
      } catch (err) {
        return { success: false, error: err.stack || err.message || String(err) };
      }
    })()
  `)
  if (!result.success) {
    throw new Error(result.error)
  }
}

/**
 * Wait for the React app to be fully loaded and hydrated by waiting for data-loading="false"
 */
export async function waitForAppReady(page: any, timeout = 15000) {
  await page.waitForSelector('div[data-loading="false"]', timeout);
  await new Promise((resolve) => setTimeout(resolve, 300));
}




