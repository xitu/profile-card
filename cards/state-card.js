const Card  = require('../lib/card');
const { icons, rankIcon } = require('../lib/icons.js');
const {
  CustomError,
  clampValue,
  flexLayout,
  getCardColors,
  kFormatter,
  measureText,
} = require('../lib/utils.js');

const { getStyles } = require('../lib/styles.js');
const { createTextNode } = require('../lib/create-node');

const CARD_MIN_WIDTH = 287;
const CARD_DEFAULT_WIDTH = 287;
const RANK_CARD_MIN_WIDTH = 420;
const RANK_CARD_DEFAULT_WIDTH = 450;
const RANK_ONLY_CARD_MIN_WIDTH = 290;
const RANK_ONLY_CARD_DEFAULT_WIDTH = 290;

class StateCard {
  #options = {};
  #stats = [];
  #rank = {level: 1, percentile: 0};

  constructor(options = {}) {
    this.#options = options;
  }

  addStats(...stats) {
    stats.map((state) => state.icon = icons[state.icon]);
    this.#stats.push(...stats);
  }

  setRank({level = 1, percentile = 0} = {}) {
    this.#rank = {level, percentile};
  }

  render() {
    const rank = this.#rank;

    const {
      title,
      show_icons = true,
      hide_title = false,
      hide_border = false,
      card_width,
      hide_rank = false,
      include_all_commits = false,
      line_height = 25,
      title_color,
      ring_color,
      icon_color,
      text_color,
      text_bold = true,
      bg_color,
      theme = "default",
      border_radius,
      border_color,
      locale,
      disable_animations = false,
      rank_icon = "default",
      show = [],
    } = this.#options;
  
    const lheight = parseInt(String(line_height), 10);
  
    // returns theme based colors with proper overrides and defaults
    const { titleColor, iconColor, textColor, bgColor, borderColor, ringColor } =
      getCardColors({
        title_color,
        text_color,
        icon_color,
        bg_color,
        border_color,
        ring_color,
        theme,
      });
    
    // Meta data for creating text nodes with createTextNode function
    const STATS = this.#stats;
  
    // filter out hidden stats defined by user & create the text nodes
    const statItems = STATS.map((state, index) =>
        // create the text nodes, and pass index so that we can calculate the line spacing
        createTextNode({
          ...state,
          index,
          showIcons: show_icons,
          shiftValuePos: 80,
          bold: text_bold,
        }),
      );
  
    if (statItems.length === 0 && hide_rank) {
      throw new CustomError(
        "Could not render stats card.",
        "Either stats or rank are required.",
      );
    }
  
    // Calculate the card height depending on how many items there are
    // but if rank circle is visible clamp the minimum height to `150`
    let height = Math.max(
      45 + (statItems.length + 1) * lheight,
      hide_rank ? 0 : statItems.length ? 150 : 180,
    );
  
    // the lower the user's percentile the better
    const progress = 100 - rank.percentile;
    const cssStyles = getStyles({
      titleColor,
      ringColor,
      textColor,
      iconColor,
      show_icons,
      progress,
    });
  
    const calculateTextWidth = () => {
      return measureText(title);
    };
    
    const iconWidth = show_icons && statItems.length ? 16 + /* padding */ 1 : 0;
  
    const minCardWidth =
      (hide_rank
        ? clampValue(
            50 /* padding */ + calculateTextWidth() * 2,
            CARD_MIN_WIDTH,
            Infinity,
          )
        : statItems.length
        ? RANK_CARD_MIN_WIDTH
        : RANK_ONLY_CARD_MIN_WIDTH) + iconWidth;
    const defaultCardWidth =
      (hide_rank
        ? CARD_DEFAULT_WIDTH
        : statItems.length
        ? RANK_CARD_DEFAULT_WIDTH
        : RANK_ONLY_CARD_DEFAULT_WIDTH) + iconWidth;
    let width = card_width
      ? isNaN(card_width)
        ? defaultCardWidth
        : card_width
      : defaultCardWidth;
    if (width < minCardWidth) {
      width = minCardWidth;
    }
  
    const card = new Card({
      customTitle: title,
      width,
      height,
      border_radius,
      colors: {
        titleColor,
        textColor,
        iconColor,
        bgColor,
        borderColor,
      },
    });
  
    card.setHideBorder(hide_border);
    card.setHideTitle(hide_title);
    card.setCSS(cssStyles);
  
    if (disable_animations) card.disableAnimations();
  
    /**
     * Calculates the right rank circle translation values such that the rank circle
     * keeps respecting the following padding:
     *
     * width > RANK_CARD_DEFAULT_WIDTH: The default right padding of 70 px will be used.
     * width < RANK_CARD_DEFAULT_WIDTH: The left and right padding will be enlarged
     *   equally from a certain minimum at RANK_CARD_MIN_WIDTH.
     *
     * @returns {number} - Rank circle translation value.
     */
    const calculateRankXTranslation = () => {
      if (statItems.length) {
        const minXTranslation = RANK_CARD_MIN_WIDTH + iconWidth - 70;
        if (width > RANK_CARD_DEFAULT_WIDTH) {
          const xMaxExpansion = minXTranslation + (450 - minCardWidth) / 2;
          return xMaxExpansion + width - RANK_CARD_DEFAULT_WIDTH;
        } else {
          return minXTranslation + (width - minCardWidth) / 2;
        }
      } else {
        return width / 2 + 20 - 10;
      }
    };
  
    // Conditionally rendered elements
    const rankCircle = hide_rank
      ? ""
      : `<g data-testid="rank-circle"
            transform="translate(${calculateRankXTranslation()}, ${
              height / 2 - 50
            })">
          <circle class="rank-circle-rim" cx="-10" cy="8" r="40" />
          <circle class="rank-circle" cx="-10" cy="8" r="40" />
          <g class="rank-text">
            ${rankIcon(rank_icon, rank?.level, rank?.percentile)}
          </g>
        </g>`;
  
    // Accessibility Labels
    const labels = STATS.map((state) => {
        return `${state.label}: ${state.value}`;
      })
      .join(", ");
  
    card.setAccessibilityLabel({
      title: `${card.title}, Rank: ${rank.level}`,
      desc: labels,
    });
  
    return card.render(`
      ${rankCircle}
      <svg x="0" y="0">
        ${flexLayout({
          items: statItems,
          gap: lheight,
          direction: "column",
        }).join("")}
      </svg>
    `);
  }
}

module.exports = StateCard;