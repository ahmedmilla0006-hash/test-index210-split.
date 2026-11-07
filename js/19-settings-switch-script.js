(function(){
  const nightToggle = document.getElementById("nightToggle");
  const keepScreenSetting = document.getElementById("keepScreenSetting");
  const keepScreenToggle = document.getElementById("keepScreenToggle");

  if(nightToggle){
    function syncNightToggle(){
      nightToggle.checked = document.body.classList.contains("night-mode");
    }
    syncNightToggle();
    const nightButton = document.getElementById("nightButton");
    if(nightButton){
      nightButton.addEventListener("click", function(){
        setTimeout(syncNightToggle, 0);
      });
    }
  }

  /* إبقاء الشاشة مضاءة — إعادة القفل بعد العودة من الخلفية */
  let keepScreenWakeLock = null;
  let keepScreenRequesting = false;
  let keepScreenRetryTimers = [];

  function clearKeepScreenRetry(){
    keepScreenRetryTimers.forEach(function(t){ try{ clearTimeout(t); }catch(e){} });
    keepScreenRetryTimers = [];
  }

  async function releaseKeepScreen(){
    clearKeepScreenRetry();
    const lock = keepScreenWakeLock;
    keepScreenWakeLock = null;
    if(lock){ try{ await lock.release(); }catch(e){} }
  }

  function bindWakeLockRelease(lock){
    if(!lock || typeof lock.addEventListener !== "function") return;
    try{
      lock.addEventListener("release", function(){
        if(keepScreenWakeLock === lock) keepScreenWakeLock = null;
        if(keepScreenToggle && keepScreenToggle.checked && document.visibilityState === "visible"){
          scheduleKeepScreenRequest(150);
          scheduleKeepScreenRequest(600);
        }
      });
    }catch(e){}
  }

  async function requestKeepScreen(){
    if(!keepScreenToggle || !keepScreenToggle.checked) return;
    if(!("wakeLock" in navigator)) return;
    if(document.visibilityState !== "visible") return;
    if(keepScreenWakeLock && keepScreenWakeLock.released === false) return;
    if(keepScreenRequesting) return;
    keepScreenRequesting = true;
    try{
      const lock = await navigator.wakeLock.request("screen");
      keepScreenWakeLock = lock;
      bindWakeLockRelease(lock);
    }catch(e){
      keepScreenWakeLock = null;
      if(keepScreenToggle && keepScreenToggle.checked && document.visibilityState === "visible"){
        scheduleKeepScreenRequest(500);
      }
    }finally{
      keepScreenRequesting = false;
    }
  }

  function scheduleKeepScreenRequest(delay){
    var t = setTimeout(function(){
      var i = keepScreenRetryTimers.indexOf(t);
      if(i >= 0) keepScreenRetryTimers.splice(i, 1);
      requestKeepScreen();
    }, Math.max(0, delay || 0));
    keepScreenRetryTimers.push(t);
  }

  function ensureKeepScreenOn(){
    if(!keepScreenToggle || !keepScreenToggle.checked) return;
    if(document.visibilityState !== "visible") return;
    requestKeepScreen();
    scheduleKeepScreenRequest(200);
    scheduleKeepScreenRequest(800);
    scheduleKeepScreenRequest(2000);
  }

  if(keepScreenToggle){
    keepScreenToggle.checked = localStorage.getItem("ayaKeepScreenOn") === "1";

    keepScreenSetting.addEventListener("click", async function(){
      keepScreenToggle.checked = !keepScreenToggle.checked;
      localStorage.setItem("ayaKeepScreenOn", keepScreenToggle.checked ? "1" : "0");
      if(keepScreenToggle.checked){
        await requestKeepScreen();
        scheduleKeepScreenRequest(300);
      }else{
        await releaseKeepScreen();
      }
    });

    document.addEventListener("visibilitychange", function(){
      if(document.visibilityState === "visible") ensureKeepScreenOn();
      else { keepScreenWakeLock = null; clearKeepScreenRetry(); }
    });
    window.addEventListener("pageshow", function(){ ensureKeepScreenOn(); });
    window.addEventListener("focus", function(){ ensureKeepScreenOn(); });

    if(keepScreenToggle.checked){
      if(document.visibilityState === "visible") ensureKeepScreenOn();
      setTimeout(ensureKeepScreenOn, 500);
      setTimeout(ensureKeepScreenOn, 1500);
    }
  }
})();
