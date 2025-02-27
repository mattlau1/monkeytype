import * as TestUI from "./test-ui";
import Config from "./config";
import * as Misc from "./misc";
import * as TestStats from "./test-stats";
import * as Keymap from "./keymap";
import * as ChartController from "./chart-controller";
import * as UI from "./ui";
import * as ThemeColors from "./theme-colors";
import * as DB from "./db";
import * as TodayTracker from "./today-tracker";
import * as PbCrown from "./pb-crown";
import * as RateQuotePopup from "./rate-quote-popup";
import * as TestLogic from "./test-logic";
import * as Notifications from "./notifications";

let result;
let maxChartVal;

let useUnsmoothedRaw = false;

export function toggleUnsmoothed() {
  useUnsmoothedRaw = !useUnsmoothedRaw;
  Notifications.add(useUnsmoothedRaw ? "on" : "off", 1);
}

async function updateGraph() {
  ChartController.result.options.annotation.annotations = [];
  let labels = [];
  for (let i = 1; i <= TestStats.wpmHistory.length; i++) {
    if (TestStats.lastSecondNotRound && i === TestStats.wpmHistory.length) {
      labels.push(Misc.roundTo2(result.testDuration).toString());
    } else {
      labels.push(i.toString());
    }
  }
  ChartController.result.updateColors();
  ChartController.result.data.labels = labels;
  ChartController.result.options.scales.yAxes[0].scaleLabel.labelString = Config.alwaysShowCPM
    ? "Character per Minute"
    : "Words per Minute";
  let chartData1 = Config.alwaysShowCPM
    ? TestStats.wpmHistory.map((a) => a * 5)
    : TestStats.wpmHistory;

  let chartData2;

  if (useUnsmoothedRaw) {
    chartData2 = Config.alwaysShowCPM
      ? result.chartData.unsmoothedRaw.map((a) => a * 5)
      : result.chartData.unsmoothedRaw;
  } else {
    chartData2 = Config.alwaysShowCPM
      ? result.chartData.raw.map((a) => a * 5)
      : result.chartData.raw;
  }

  ChartController.result.data.datasets[0].data = chartData1;
  ChartController.result.data.datasets[1].data = chartData2;

  ChartController.result.data.datasets[0].label = Config.alwaysShowCPM
    ? "cpm"
    : "wpm";

  maxChartVal = Math.max(...[Math.max(...chartData2), Math.max(...chartData1)]);
  if (!Config.startGraphsAtZero) {
    let minChartVal = Math.min(
      ...[Math.min(...chartData2), Math.min(...chartData1)]
    );
    ChartController.result.options.scales.yAxes[0].ticks.min = minChartVal;
    ChartController.result.options.scales.yAxes[1].ticks.min = minChartVal;
  } else {
    ChartController.result.options.scales.yAxes[0].ticks.min = 0;
    ChartController.result.options.scales.yAxes[1].ticks.min = 0;
  }

  ChartController.result.data.datasets[2].data = result.chartData.err;

  let fc = await ThemeColors.get("sub");
  if (Config.funbox !== "none") {
    let content = Config.funbox;
    if (Config.funbox === "layoutfluid") {
      content += " " + Config.customLayoutfluid.replace(/#/g, " ");
    }
    ChartController.result.options.annotation.annotations.push({
      enabled: false,
      type: "line",
      mode: "horizontal",
      scaleID: "wpm",
      value: 0,
      borderColor: "transparent",
      borderWidth: 1,
      borderDash: [2, 2],
      label: {
        backgroundColor: "transparent",
        fontFamily: Config.fontFamily.replace(/_/g, " "),
        fontSize: 11,
        fontStyle: "normal",
        fontColor: fc,
        xPadding: 6,
        yPadding: 6,
        cornerRadius: 3,
        position: "left",
        enabled: true,
        content: `${content}`,
        yAdjust: -11,
      },
    });
  }

  ChartController.result.options.scales.yAxes[0].ticks.max = maxChartVal;
  ChartController.result.options.scales.yAxes[1].ticks.max = maxChartVal;

  ChartController.result.update({ duration: 0 });
  ChartController.result.resize();
}

export async function updateGraphPBLine() {
  let themecolors = await ThemeColors.get();
  let lpb = await DB.getLocalPB(
    result.mode,
    result.mode2,
    result.punctuation,
    result.language,
    result.difficulty,
    result.lazyMode,
    result.funbox
  );
  if (lpb == 0) return;
  let chartlpb = Misc.roundTo2(Config.alwaysShowCPM ? lpb * 5 : lpb).toFixed(2);
  ChartController.result.options.annotation.annotations.push({
    enabled: false,
    type: "line",
    mode: "horizontal",
    scaleID: "wpm",
    value: chartlpb,
    borderColor: themecolors["sub"],
    borderWidth: 1,
    borderDash: [2, 2],
    label: {
      backgroundColor: themecolors["sub"],
      fontFamily: Config.fontFamily.replace(/_/g, " "),
      fontSize: 11,
      fontStyle: "normal",
      fontColor: themecolors["bg"],
      xPadding: 6,
      yPadding: 6,
      cornerRadius: 3,
      position: "center",
      enabled: true,
      content: `PB: ${chartlpb}`,
    },
  });
  if (
    maxChartVal >= parseFloat(chartlpb) - 20 &&
    maxChartVal <= parseFloat(chartlpb) + 20
  ) {
    maxChartVal = parseFloat(chartlpb) + 20;
  }
  ChartController.result.options.scales.yAxes[0].ticks.max = Math.round(
    maxChartVal
  );
  ChartController.result.options.scales.yAxes[1].ticks.max = Math.round(
    maxChartVal
  );
  ChartController.result.update({ duration: 0 });
}

function updateWpmAndAcc() {
  let inf = false;
  if (result.wpm >= 1000) {
    inf = true;
  }
  if (Config.alwaysShowDecimalPlaces) {
    if (Config.alwaysShowCPM == false) {
      $("#result .stats .wpm .top .text").text("wpm");
      if (inf) {
        $("#result .stats .wpm .bottom").text("Infinite");
      } else {
        $("#result .stats .wpm .bottom").text(
          Misc.roundTo2(result.wpm).toFixed(2)
        );
      }
      $("#result .stats .raw .bottom").text(
        Misc.roundTo2(result.rawWpm).toFixed(2)
      );
      $("#result .stats .wpm .bottom").attr(
        "aria-label",
        Misc.roundTo2(result.wpm * 5).toFixed(2) + " cpm"
      );
    } else {
      $("#result .stats .wpm .top .text").text("cpm");
      if (inf) {
        $("#result .stats .wpm .bottom").text("Infinite");
      } else {
        $("#result .stats .wpm .bottom").text(
          Misc.roundTo2(result.wpm * 5).toFixed(2)
        );
      }
      $("#result .stats .raw .bottom").text(
        Misc.roundTo2(result.rawWpm * 5).toFixed(2)
      );
      $("#result .stats .wpm .bottom").attr(
        "aria-label",
        Misc.roundTo2(result.wpm).toFixed(2) + " wpm"
      );
    }

    $("#result .stats .acc .bottom").text(
      result.acc == 100 ? "100%" : Misc.roundTo2(result.acc).toFixed(2) + "%"
    );
    let time = Misc.roundTo2(result.testDuration).toFixed(2) + "s";
    if (result.testDuration > 61) {
      time = Misc.secondsToString(Misc.roundTo2(result.testDuration));
    }
    $("#result .stats .time .bottom .text").text(time);
    $("#result .stats .raw .bottom").removeAttr("aria-label");
    $("#result .stats .acc .bottom").removeAttr("aria-label");
  } else {
    //not showing decimal places
    if (Config.alwaysShowCPM == false) {
      $("#result .stats .wpm .top .text").text("wpm");
      $("#result .stats .wpm .bottom").attr(
        "aria-label",
        result.wpm + ` (${Misc.roundTo2(result.wpm * 5)} cpm)`
      );
      if (inf) {
        $("#result .stats .wpm .bottom").text("Infinite");
      } else {
        $("#result .stats .wpm .bottom").text(Math.round(result.wpm));
      }
      $("#result .stats .raw .bottom").text(Math.round(result.rawWpm));
      $("#result .stats .raw .bottom").attr("aria-label", result.rawWpm);
    } else {
      $("#result .stats .wpm .top .text").text("cpm");
      $("#result .stats .wpm .bottom").attr(
        "aria-label",
        Misc.roundTo2(result.wpm * 5) + ` (${Misc.roundTo2(result.wpm)} wpm)`
      );
      if (inf) {
        $("#result .stats .wpm .bottom").text("Infinite");
      } else {
        $("#result .stats .wpm .bottom").text(Math.round(result.wpm * 5));
      }
      $("#result .stats .raw .bottom").text(Math.round(result.rawWpm * 5));
      $("#result .stats .raw .bottom").attr("aria-label", result.rawWpm * 5);
    }

    $("#result .stats .acc .bottom").text(Math.floor(result.acc) + "%");
    $("#result .stats .acc .bottom").attr("aria-label", result.acc + "%");
  }
}

function updateConsistency() {
  if (Config.alwaysShowDecimalPlaces) {
    $("#result .stats .consistency .bottom").text(
      Misc.roundTo2(result.consistency).toFixed(2) + "%"
    );
    $("#result .stats .consistency .bottom").attr(
      "aria-label",
      `${result.keyConsistency.toFixed(2)}% key`
    );
  } else {
    $("#result .stats .consistency .bottom").text(
      Math.round(result.consistency) + "%"
    );
    $("#result .stats .consistency .bottom").attr(
      "aria-label",
      `${result.consistency}% (${result.keyConsistency}% key)`
    );
  }
}

function updateTime() {
  let afkSecondsPercent = Misc.roundTo2(
    (result.afkDuration / result.testDuration) * 100
  );
  $("#result .stats .time .bottom .afk").text("");
  if (afkSecondsPercent > 0) {
    $("#result .stats .time .bottom .afk").text(afkSecondsPercent + "% afk");
  }
  $("#result .stats .time .bottom").attr(
    "aria-label",
    `${result.afkDuration}s afk ${afkSecondsPercent}%`
  );
  if (Config.alwaysShowDecimalPlaces) {
    let time = Misc.roundTo2(result.testDuration).toFixed(2) + "s";
    if (result.testDuration > 61) {
      time = Misc.secondsToString(Misc.roundTo2(result.testDuration));
    }
    $("#result .stats .time .bottom .text").text(time);
  } else {
    let time = Math.round(result.testDuration) + "s";
    if (result.testDuration > 61) {
      time = Misc.secondsToString(Math.round(result.testDuration));
    }
    $("#result .stats .time .bottom .text").text(time);
    $("#result .stats .time .bottom").attr(
      "aria-label",
      `${Misc.roundTo2(result.testDuration)}s (${
        result.afkDuration
      }s afk ${afkSecondsPercent}%)`
    );
  }
}

export function updateTodayTracker() {
  $("#result .stats .time .bottom .timeToday").text(TodayTracker.getString());
}

function updateKey() {
  $("#result .stats .key .bottom").text(
    result.charStats[0] +
      "/" +
      result.charStats[1] +
      "/" +
      result.charStats[2] +
      "/" +
      result.charStats[3]
  );
}

export function showCrown() {
  PbCrown.show();
}

export function hideCrown() {
  PbCrown.hide();
  $("#result .stats .wpm .crown").attr("aria-label", "");
}

export async function updateCrown() {
  let pbDiff = 0;
  const lpb = await DB.getLocalPB(
    Config.mode,
    result.mode2,
    Config.punctuation,
    Config.language,
    Config.difficulty,
    Config.lazyMode,
    Config.funbox
  );
  pbDiff = Math.abs(result.wpm - lpb);
  $("#result .stats .wpm .crown").attr(
    "aria-label",
    "+" + Misc.roundTo2(pbDiff)
  );
}

function updateTags(dontSave) {
  let activeTags = [];
  try {
    DB.getSnapshot().tags.forEach((tag) => {
      if (tag.active === true) {
        activeTags.push(tag);
      }
    });
  } catch (e) {}

  $("#result .stats .tags").addClass("hidden");
  if (activeTags.length == 0) {
    $("#result .stats .tags").addClass("hidden");
  } else {
    $("#result .stats .tags").removeClass("hidden");
  }
  $("#result .stats .tags .bottom").text("");
  let annotationSide = "left";
  let labelAdjust = 15;
  activeTags.forEach(async (tag) => {
    let tpb = await DB.getLocalTagPB(
      tag._id,
      Config.mode,
      result.mode2,
      Config.punctuation,
      Config.language,
      Config.difficulty,
      Config.lazyMode
    );
    $("#result .stats .tags .bottom").append(`
      <div tagid="${tag._id}" aria-label="PB: ${tpb}" data-balloon-pos="up">${tag.name}<i class="fas fa-crown hidden"></i></div>
    `);
    if (Config.mode != "quote" && !dontSave) {
      if (tpb < result.wpm) {
        //new pb for that tag
        DB.saveLocalTagPB(
          tag._id,
          Config.mode,
          result.mode2,
          Config.punctuation,
          Config.language,
          Config.difficulty,
          Config.lazyMode,
          result.wpm,
          result.acc,
          result.rawWpm,
          result.consistency
        );
        $(
          `#result .stats .tags .bottom div[tagid="${tag._id}"] .fas`
        ).removeClass("hidden");
        $(`#result .stats .tags .bottom div[tagid="${tag._id}"]`).attr(
          "aria-label",
          "+" + Misc.roundTo2(result.wpm - tpb)
        );
        // console.log("new pb for tag " + tag.name);
      } else {
        let themecolors = await ThemeColors.get();
        ChartController.result.options.annotation.annotations.push({
          enabled: false,
          type: "line",
          mode: "horizontal",
          scaleID: "wpm",
          value: Config.alwaysShowCPM ? tpb * 5 : tpb,
          borderColor: themecolors["sub"],
          borderWidth: 1,
          borderDash: [2, 2],
          label: {
            backgroundColor: themecolors["sub"],
            fontFamily: Config.fontFamily.replace(/_/g, " "),
            fontSize: 11,
            fontStyle: "normal",
            fontColor: themecolors["bg"],
            xPadding: 6,
            yPadding: 6,
            cornerRadius: 3,
            position: annotationSide,
            xAdjust: labelAdjust,
            enabled: true,
            content: `${tag.name} PB: ${Misc.roundTo2(
              Config.alwaysShowCPM ? tpb * 5 : tpb
            ).toFixed(2)}`,
          },
        });
        if (annotationSide === "left") {
          annotationSide = "right";
          labelAdjust = -15;
        } else {
          annotationSide = "left";
          labelAdjust = 15;
        }
      }
    }
  });
}

function updateTestType() {
  let testType = "";

  if (Config.mode === "quote") {
    let qlen = "";
    if (Config.quoteLength === 0) {
      qlen = "short ";
    } else if (Config.quoteLength === 1) {
      qlen = "medium ";
    } else if (Config.quoteLength === 2) {
      qlen = "long ";
    } else if (Config.quoteLength === 3) {
      qlen = "thicc ";
    }
    testType += qlen + Config.mode;
  } else {
    testType += Config.mode;
  }
  if (Config.mode == "time") {
    testType += " " + Config.time;
  } else if (Config.mode == "words") {
    testType += " " + Config.words;
  }
  if (
    Config.mode != "custom" &&
    Config.funbox !== "gibberish" &&
    Config.funbox !== "ascii" &&
    Config.funbox !== "58008"
  ) {
    testType += "<br>" + result.language.replace(/_/g, " ");
  }
  if (Config.punctuation) {
    testType += "<br>punctuation";
  }
  if (Config.numbers) {
    testType += "<br>numbers";
  }
  if (Config.blindMode) {
    testType += "<br>blind";
  }
  if (Config.lazyMode) {
    testType += "<br>lazy";
  }
  if (Config.funbox !== "none") {
    testType += "<br>" + Config.funbox.replace(/_/g, " ");
  }
  if (Config.difficulty == "expert") {
    testType += "<br>expert";
  } else if (Config.difficulty == "master") {
    testType += "<br>master";
  }

  $("#result .stats .testType .bottom").html(testType);
}

function updateOther(
  difficultyFailed,
  failReason,
  afkDetected,
  isRepeated,
  tooShort
) {
  let otherText = "";
  if (difficultyFailed) {
    otherText += `<br>failed (${failReason})`;
  }
  if (afkDetected) {
    otherText += "<br>afk detected";
  }
  if (TestStats.invalid) {
    otherText += "<br>invalid";
    let extra = "";
    if (result.wpm < 0 || result.wpm > 350) {
      extra += "wpm";
    }
    if (result.acc < 75 || result.acc > 100) {
      if (extra.length > 0) {
        extra += ", ";
      }
      extra += "accuracy";
    }
    if (extra.length > 0) {
      otherText += ` (${extra})`;
    }
  }
  if (isRepeated) {
    otherText += "<br>repeated";
  }
  if (result.bailedOut) {
    otherText += "<br>bailed out";
  }
  if (tooShort) {
    otherText += "<br>too short";
  }

  if (otherText == "") {
    $("#result .stats .info").addClass("hidden");
  } else {
    $("#result .stats .info").removeClass("hidden");
    otherText = otherText.substring(4);
    $("#result .stats .info .bottom").html(otherText);
  }
}

export function updateRateQuote(randomQuote) {
  if (Config.mode === "quote") {
    let userqr = DB.getSnapshot().quoteRatings?.[randomQuote.language]?.[
      randomQuote.id
    ];
    if (userqr) {
      $(".pageTest #result #rateQuoteButton .icon")
        .removeClass("far")
        .addClass("fas");
    }
    RateQuotePopup.getQuoteStats(randomQuote).then((quoteStats) => {
      if (quoteStats !== null) {
        $(".pageTest #result #rateQuoteButton .rating").text(
          quoteStats.average
        );
      }
      $(".pageTest #result #rateQuoteButton")
        .css({ opacity: 0 })
        .removeClass("hidden")
        .css({ opacity: 1 });
    });
  }
}

function updateQuoteSource(randomQuote) {
  if (Config.mode === "quote") {
    $("#result .stats .source").removeClass("hidden");
    $("#result .stats .source .bottom").html(randomQuote.source);
  } else {
    $("#result .stats .source").addClass("hidden");
  }
}

export function update(
  res,
  difficultyFailed,
  failReason,
  afkDetected,
  isRepeated,
  tooShort,
  randomQuote,
  dontSave
) {
  result = res;
  $("#result #resultWordsHistory").addClass("hidden");
  $("#retrySavingResultButton").addClass("hidden");
  $(".pageTest #result #rateQuoteButton .icon")
    .removeClass("fas")
    .addClass("far");
  $(".pageTest #result #rateQuoteButton .rating").text("");
  $(".pageTest #result #rateQuoteButton").addClass("hidden");
  $("#testModesNotice").css("opacity", 0);
  $("#words").removeClass("blurred");
  $("#wordsInput").blur();
  $("#result .stats .time .bottom .afk").text("");
  if (firebase.auth().currentUser != null) {
    $("#result .loginTip").addClass("hidden");
  } else {
    $("#result .loginTip").removeClass("hidden");
  }
  updateWpmAndAcc();
  updateConsistency();
  updateTime();
  updateKey();
  updateTestType();
  updateQuoteSource(randomQuote);
  updateGraph();
  updateGraphPBLine();
  updateTags(dontSave);
  updateOther(difficultyFailed, failReason, afkDetected, isRepeated, tooShort);

  if (
    $("#result .stats .tags").hasClass("hidden") &&
    $("#result .stats .info").hasClass("hidden")
  ) {
    $("#result .stats .infoAndTags").addClass("hidden");
  } else {
    $("#result .stats .infoAndTags").removeClass("hidden");
  }

  if (TestLogic.glarsesMode) {
    $("#middle #result .noStressMessage").remove();
    $("#middle #result").prepend(`

      <div class='noStressMessage' style="
        text-align: center;
        grid-column: 1/3;
        font-size: 2rem;
        padding-bottom: 2rem;
      ">
      <i class="fas fa-check"></i>
      </div>

    `);
    $("#middle #result .stats").addClass("hidden");
    $("#middle #result .chart").addClass("hidden");
    $("#middle #result #resultWordsHistory").addClass("hidden");
    $("#middle #result #resultReplay").addClass("hidden");
    $("#middle #result .loginTip").addClass("hidden");
    $("#middle #result #showWordHistoryButton").addClass("hidden");
    $("#middle #result #watchReplayButton").addClass("hidden");
    $("#middle #result #saveScreenshotButton").addClass("hidden");

    console.log(
      `Test Completed: ${result.wpm} wpm ${result.acc}% acc ${result.rawWpm} raw ${result.consistency}% consistency`
    );
  } else {
    $("#middle #result .stats").removeClass("hidden");
    $("#middle #result .chart").removeClass("hidden");
    // $("#middle #result #resultWordsHistory").removeClass("hidden");
    if (firebase.auth().currentUser == null) {
      $("#middle #result .loginTip").removeClass("hidden");
    }
    $("#middle #result #showWordHistoryButton").removeClass("hidden");
    $("#middle #result #watchReplayButton").removeClass("hidden");
    $("#middle #result #saveScreenshotButton").removeClass("hidden");
  }

  if (window.scrollY > 0)
    $([document.documentElement, document.body])
      .stop()
      .animate({ scrollTop: 0 }, 250);

  UI.swapElements(
    $("#typingTest"),
    $("#result"),
    250,
    () => {
      TestUI.setResultCalculating(false);
      $("#words").empty();
      ChartController.result.resize();

      if (Config.alwaysShowWordsHistory && Config.burstHeatmap) {
        TestUI.applyBurstHeatmap();
      }
      $("#result").focus();
      window.scrollTo({ top: 0 });
      $("#testModesNotice").addClass("hidden");
    },
    () => {
      $("#resultExtraButtons").removeClass("hidden").css("opacity", 0).animate(
        {
          opacity: 1,
        },
        125
      );
      if (Config.alwaysShowWordsHistory && !TestLogic.glarsesMode) {
        TestUI.toggleResultWords();
      }
      Keymap.hide();
    }
  );
}
