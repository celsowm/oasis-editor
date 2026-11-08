/**
 * Date/time field formatting.
 *
 * DATE/TIME fields in Word carry a `\@` picture (e.g. `"M/d/yyyy"`) that
 * controls the displayed result. This module mirrors WordCraft's `DATE_FORMATS`
 * vocabulary and formats a JavaScript Date according to the common picture
 * tokens Word understands, so an authored date field renders deterministically
 * and round-trips through DOCX.
 */
export const DATE_FORMATS: ReadonlyArray<string> = [
  "M/d/yyyy",
  "dddd, MMMM d, yyyy",
  "MMMM d, yyyy",
  "M/d/yy",
  "yyyy-MM-dd",
  "d-MMM-yy",
  "M.d.yyyy",
  "d MMMM yyyy",
  "MMMM yy",
  "MMM-yy",
  "M/d/yyyy h:mm am/pm",
  "M/d/yyyy h:mm:ss am/pm",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Format a Date according to a Word `\@` picture. Unrecognized tokens are
 * passed through literally; `am/pm` renders "am"/"pm". Supports the common
 * tokens: d/dd/ddd/dddd (day), M/MM/MMM/MMMM (month), yy/yyyy (year),
 * h/hh (12h), H (24h), m/mm (minute), s/ss (second), and literal text.
 */
export function formatDate(value: Date, picture: string): string {
  let out = "";
  const padded = (n: number): string => String(n).padStart(2, "0");
  let i = 0;
  const text = picture;
  while (i < text.length) {
    const ch = text[i];
    // Try to match a run of the same letter to catch multi-char tokens
    // (yyyy, MMMM, dddd, am/pm handled specially below).
    let run = ch;
    while (i + run.length < text.length && text[i + run.length] === ch) {
      run += ch;
    }
    const hours24 = value.getHours();
    switch (ch) {
      case "d":
        out +=
          run.length >= 4
            ? DAY_NAMES[value.getDay()]
            : run.length === 3
              ? DAY_NAMES[value.getDay()].slice(0, 3)
              : run.length === 2
                ? padded(value.getDate())
                : String(value.getDate());
        break;
      case "M":
        out +=
          run.length >= 4
            ? MONTH_NAMES[value.getMonth()]
            : run.length === 3
              ? MONTH_NAMES[value.getMonth()].slice(0, 3)
              : run.length === 2
                ? padded(value.getMonth() + 1)
                : String(value.getMonth() + 1);
        break;
      case "y":
        out +=
          run.length >= 3
            ? String(value.getFullYear())
            : String(value.getFullYear()).slice(-2);
        break;
      case "H":
        out += padded(hours24);
        break;
      case "h":
        out +=
          run.length >= 2
            ? padded(hours24 % 12 === 0 ? 12 : hours24 % 12)
            : String(hours24 % 12 === 0 ? 12 : hours24 % 12);
        break;
      case "m":
        out +=
          run.length >= 2
            ? padded(value.getMinutes())
            : String(value.getMinutes());
        break;
      case "s":
        out +=
          run.length >= 2
            ? padded(value.getSeconds())
            : String(value.getSeconds());
        break;
      default: {
        // Handle the literal "am/pm" / "AM/PM" marker.
        const rest = text.slice(i).toLowerCase();
        if (rest.startsWith("am/pm")) {
          out += hours24 < 12 ? "am" : "pm";
          i += 5;
          continue;
        }
        out += ch;
      }
    }
    i += run.length;
  }
  return out;
}
