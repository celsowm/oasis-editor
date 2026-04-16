use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CharNode {
    ch: String,
    bold: bool,
    italic: bool,
    underline: bool,
    color: String,
    font_family: String,
    font_size: u32,
}

#[derive(Clone, Serialize, Deserialize)]
struct Line {
    id: String,
    align: String,
    chars: Vec<CharNode>,
}

#[derive(Clone, Serialize, Deserialize)]
struct Position {
    r: usize,
    c: usize,
}

#[derive(Clone, Serialize, Deserialize)]
struct Selection {
    anchor: Position,
    focus: Position,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActiveFormats {
    bold: bool,
    italic: bool,
    underline: bool,
    color: String,
    font_family: String,
    font_size: u32,
}

#[derive(Clone, Serialize, Deserialize)]
struct OperationRecord {
    #[serde(rename = "type")]
    op_type: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EditorState {
    lines: Vec<Line>,
    cursor: Position,
    selection: Option<Selection>,
    active_formats: ActiveFormats,
    is_focused: bool,
    last_operation: Option<OperationRecord>,
}

#[wasm_bindgen]
pub struct EditorRuntimeWasm {
    state: EditorState,
    history: Vec<EditorState>,
    future: Vec<EditorState>,
    line_counter: usize,
}

#[wasm_bindgen]
impl EditorRuntimeWasm {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EditorRuntimeWasm {
        let mut runtime = EditorRuntimeWasm {
            state: EditorState {
                lines: vec![],
                cursor: Position { r: 0, c: 0 },
                selection: None,
                active_formats: default_formats(),
                is_focused: false,
                last_operation: None,
            },
            history: vec![],
            future: vec![],
            line_counter: 0,
        };

        runtime.state.lines = initial_lines(&mut runtime.line_counter);
        runtime
    }

    pub fn get_state_json(&self) -> String {
        serde_json::to_string(&self.presentation_state()).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn dispatch(&mut self, operation_json: String) {
        self.dispatch_internal(operation_json, true);
    }

    pub fn dispatch_without_history(&mut self, operation_json: String) {
        self.dispatch_internal(operation_json, false);
    }

    pub fn undo(&mut self) {
        if self.history.is_empty() {
            return;
        }

        if let Some(previous) = self.history.pop() {
            self.future.insert(0, self.state.clone());
            self.state = previous;
        }
    }

    pub fn redo(&mut self) {
        if self.future.is_empty() {
            return;
        }

        let next = self.future.remove(0);
        self.history.push(self.state.clone());
        if self.history.len() > 100 {
            self.history.remove(0);
        }
        self.state = next;
    }

    pub fn get_selected_text(&self) -> String {
        selected_text(&self.state.lines, &self.state.selection)
    }

    pub fn cut_selection(&mut self) {
        if self.get_selected_text().is_empty() {
            return;
        }
        self.dispatch_internal(json!({"type":"DELETE_BACKWARD","payload":{}}).to_string(), true);
    }

    pub fn export_json(&self) -> String {
        serde_json::to_string_pretty(&json!({
            "version": 3,
            "engine": "rust-wasm",
            "noContentEditable": true,
            "document": self.state.lines,
            "cursor": self.state.cursor,
            "selection": self.state.selection,
            "activeFormats": self.state.active_formats
        }))
        .unwrap_or_else(|_| "{}".to_string())
    }
}

impl EditorRuntimeWasm {
    fn dispatch_internal(&mut self, operation_json: String, record_history: bool) {
        let parsed: Value = serde_json::from_str(&operation_json).unwrap_or_else(|_| json!({}));
        let op_type = parsed.get("type").and_then(|v| v.as_str()).unwrap_or("UNKNOWN").to_string();
        let payload = parsed.get("payload").cloned().unwrap_or_else(|| json!({}));

        if record_history {
            self.history.push(self.state.clone());
            if self.history.len() > 100 {
                self.history.remove(0);
            }
            self.future.clear();
        }

        match op_type.as_str() {
            "SET_FOCUS" => {
                self.state.is_focused = payload.get("isFocused").and_then(|v| v.as_bool()).unwrap_or(false);
            }
            "SELECT_ALL" => {
                let last_row = self.state.lines.len().saturating_sub(1);
                let end = Position {
                    r: last_row,
                    c: line_length(self.state.lines.get(last_row)),
                };
                self.state.cursor = end.clone();
                self.state.selection = Some(Selection {
                    anchor: Position { r: 0, c: 0 },
                    focus: end,
                });
            }
            "SET_POINTER_SELECTION" => {
                let anchor = parse_position(payload.get("anchor"));
                let focus = parse_position(payload.get("focus"));
                self.state.cursor = focus.clone();
                if compare_positions(&anchor, &focus) == 0 {
                    self.state.selection = None;
                } else {
                    self.state.selection = Some(Selection { anchor, focus });
                }
            }
            "CLEAR_SELECTION" => {
                let cursor = parse_position(payload.get("cursor"));
                self.state.cursor = cursor;
                self.state.selection = None;
            }
            "MOVE_CURSOR" => {
                let key = payload.get("key").and_then(|v| v.as_str()).unwrap_or("ArrowRight");
                let extend = payload.get("extendSelection").and_then(|v| v.as_bool()).unwrap_or(false);
                self.move_cursor(key, extend);
            }
            "INSERT_TEXT" => {
                let text = payload.get("text").and_then(|v| v.as_str()).unwrap_or("");
                self.insert_text(text);
            }
            "DELETE_BACKWARD" => self.delete_backward(),
            "DELETE_FORWARD" => self.delete_forward(),
            "TOGGLE_MARK" => {
                if let Some(mark) = payload.get("mark").and_then(|v| v.as_str()) {
                    self.toggle_mark(mark);
                }
            }
            "APPLY_PROPERTY" => {
                if let Some(key) = payload.get("key").and_then(|v| v.as_str()) {
                    self.apply_property(key, payload.get("value").cloned().unwrap_or(Value::Null));
                }
            }
            "APPLY_ALIGNMENT" => {
                if let Some(align) = payload.get("align").and_then(|v| v.as_str()) {
                    self.apply_alignment(align.to_string());
                }
            }
            _ => {}
        }

        self.state.last_operation = Some(OperationRecord { op_type });
    }

    fn presentation_state(&self) -> Value {
        let selection_active = has_selection(&self.state.selection);
        let shared_alignment = shared_alignment(&self.state.lines, &self.state.selection, &self.state.cursor);

        json!({
            "lines": self.state.lines,
            "cursor": self.state.cursor,
            "selection": self.state.selection,
            "normalizedSelection": normalized_selection_value(&self.state.selection),
            "activeFormats": self.state.active_formats,
            "isFocused": self.state.is_focused,
            "lastOperation": self.state.last_operation,
            "history": vec![0; self.history.len()],
            "future": vec![0; self.future.len()],
            "selectionActive": selection_active,
            "boldActive": if selection_active { range_fully_formatted(&self.state.lines, &self.state.selection, |c| c.bold) } else { self.state.active_formats.bold },
            "italicActive": if selection_active { range_fully_formatted(&self.state.lines, &self.state.selection, |c| c.italic) } else { self.state.active_formats.italic },
            "underlineActive": if selection_active { range_fully_formatted(&self.state.lines, &self.state.selection, |c| c.underline) } else { self.state.active_formats.underline },
            "sharedAlignment": shared_alignment,
        })
    }

    fn move_cursor(&mut self, key: &str, extend_selection: bool) {
        let selection_active = has_selection(&self.state.selection);

        if extend_selection {
            let anchor = if selection_active {
                self.state.selection.as_ref().unwrap().anchor.clone()
            } else {
                self.state.cursor.clone()
            };
            let focus = if selection_active {
                self.state.selection.as_ref().unwrap().focus.clone()
            } else {
                self.state.cursor.clone()
            };
            let next_cursor = moved_cursor(key, &focus, &self.state.lines);
            self.state.cursor = next_cursor.clone();
            self.state.selection = if compare_positions(&anchor, &next_cursor) == 0 {
                None
            } else {
                Some(Selection { anchor, focus: next_cursor })
            };
            return;
        }

        if selection_active {
            let normalized = normalized_selection(&self.state.selection).unwrap();
            let boundary = if key == "ArrowLeft" || key == "ArrowUp" { normalized.0 } else { normalized.1 };
            self.state.cursor = boundary;
            self.state.selection = None;
            return;
        }

        self.state.cursor = moved_cursor(key, &self.state.cursor, &self.state.lines);
    }

    fn insert_text(&mut self, text: &str) {
        let mut working_lines = self.state.lines.clone();
        let mut working_cursor = self.state.cursor.clone();

        if has_selection(&self.state.selection) {
            let removed = delete_selection(&self.state.lines, &self.state.selection);
            working_lines = removed.0;
            working_cursor = removed.1;
        }

        let (next_lines, next_cursor) = insert_text_at_position(
            &working_lines,
            &working_cursor,
            text,
            &self.state.active_formats,
            &mut self.line_counter,
        );

        self.state.lines = next_lines;
        self.state.cursor = next_cursor;
        self.state.selection = None;
    }

    fn delete_backward(&mut self) {
        if has_selection(&self.state.selection) {
            let removed = delete_selection(&self.state.lines, &self.state.selection);
            self.state.lines = removed.0;
            self.state.cursor = removed.1;
            self.state.selection = None;
            return;
        }

        let (lines, cursor) = delete_char_near_cursor(&self.state.lines, &self.state.cursor, true);
        self.state.lines = lines;
        self.state.cursor = cursor;
        self.state.selection = None;
    }

    fn delete_forward(&mut self) {
        if has_selection(&self.state.selection) {
            let removed = delete_selection(&self.state.lines, &self.state.selection);
            self.state.lines = removed.0;
            self.state.cursor = removed.1;
            self.state.selection = None;
            return;
        }

        let (lines, cursor) = delete_char_near_cursor(&self.state.lines, &self.state.cursor, false);
        self.state.lines = lines;
        self.state.cursor = cursor;
        self.state.selection = None;
    }

    fn toggle_mark(&mut self, mark: &str) {
        if has_selection(&self.state.selection) {
            let enabled = match mark {
                "bold" => range_fully_formatted(&self.state.lines, &self.state.selection, |c| c.bold),
                "italic" => range_fully_formatted(&self.state.lines, &self.state.selection, |c| c.italic),
                "underline" => range_fully_formatted(&self.state.lines, &self.state.selection, |c| c.underline),
                _ => false,
            };

            self.state.lines = apply_to_selection(&self.state.lines, &self.state.selection, |char_node| {
                let mut next = char_node.clone();
                match mark {
                    "bold" => next.bold = !enabled,
                    "italic" => next.italic = !enabled,
                    "underline" => next.underline = !enabled,
                    _ => {}
                }
                next
            });
            return;
        }

        match mark {
            "bold" => self.state.active_formats.bold = !self.state.active_formats.bold,
            "italic" => self.state.active_formats.italic = !self.state.active_formats.italic,
            "underline" => self.state.active_formats.underline = !self.state.active_formats.underline,
            _ => {}
        }
    }

    fn apply_property(&mut self, key: &str, value: Value) {
        if has_selection(&self.state.selection) {
            self.state.lines = apply_to_selection(&self.state.lines, &self.state.selection, |char_node| {
                let mut next = char_node.clone();
                apply_property_on_char(&mut next, key, &value);
                next
            });
            return;
        }

        apply_property_on_formats(&mut self.state.active_formats, key, &value);
    }

    fn apply_alignment(&mut self, align: String) {
        let rows = affected_rows(&self.state.selection, &self.state.cursor);
        let mut next_lines = self.state.lines.clone();
        for row in rows {
            if let Some(line) = next_lines.get_mut(row) {
                line.align = align.clone();
            }
        }
        self.state.lines = next_lines;
    }
}

fn default_formats() -> ActiveFormats {
    ActiveFormats {
        bold: false,
        italic: false,
        underline: false,
        color: "#111827".to_string(),
        font_family: "Arial".to_string(),
        font_size: 15,
    }
}

fn initial_lines(counter: &mut usize) -> Vec<Line> {
    let lines = vec![
        "Oasis Editor now includes a Rust core target for WebAssembly.",
        "The editor still never uses contenteditable.",
        "",
        "Current architecture:",
        "• UI in ECMAScript",
        "• document engine available in Rust source",
        "• fallback JavaScript runtime when wasm is not compiled yet",
        "• same operation contract for both runtimes",
        "",
        "Compile the rust-core crate with wasm-pack to switch the backend.",
    ];

    lines.into_iter().map(|line| create_line(line, "left", &default_formats(), counter)).collect()
}

fn create_line(text: &str, align: &str, formats: &ActiveFormats, counter: &mut usize) -> Line {
    *counter += 1;
    Line {
        id: format!("line-{}", counter),
        align: align.to_string(),
        chars: text.chars().map(|ch| create_char(ch, formats)).collect(),
    }
}

fn create_char(ch: char, formats: &ActiveFormats) -> CharNode {
    CharNode {
        ch: ch.to_string(),
        bold: formats.bold,
        italic: formats.italic,
        underline: formats.underline,
        color: formats.color.clone(),
        font_family: formats.font_family.clone(),
        font_size: formats.font_size,
    }
}

fn parse_position(value: Option<&Value>) -> Position {
    Position {
        r: value.and_then(|v| v.get("r")).and_then(|v| v.as_u64()).unwrap_or(0) as usize,
        c: value.and_then(|v| v.get("c")).and_then(|v| v.as_u64()).unwrap_or(0) as usize,
    }
}

fn line_length(line: Option<&Line>) -> usize {
    line.map(|l| l.chars.len()).unwrap_or(0)
}

fn compare_positions(a: &Position, b: &Position) -> i32 {
    if a.r != b.r {
        return a.r as i32 - b.r as i32;
    }
    a.c as i32 - b.c as i32
}

fn has_selection(selection: &Option<Selection>) -> bool {
    selection
        .as_ref()
        .map(|selection| compare_positions(&selection.anchor, &selection.focus) != 0)
        .unwrap_or(false)
}

fn normalized_selection(selection: &Option<Selection>) -> Option<(Position, Position)> {
    selection.as_ref().map(|selection| {
        if compare_positions(&selection.anchor, &selection.focus) <= 0 {
            (selection.anchor.clone(), selection.focus.clone())
        } else {
            (selection.focus.clone(), selection.anchor.clone())
        }
    })
}

fn normalized_selection_value(selection: &Option<Selection>) -> Value {
    if let Some((start, end)) = normalized_selection(selection) {
        json!({ "start": start, "end": end })
    } else {
        Value::Null
    }
}

fn selected_text(lines: &Vec<Line>, selection: &Option<Selection>) -> String {
    let Some((start, end)) = normalized_selection(selection) else {
        return String::new();
    };

    if compare_positions(&start, &end) == 0 {
        return String::new();
    }

    if start.r == end.r {
        let text = line_text(&lines[start.r]);
        return text.chars().skip(start.c).take(end.c - start.c).collect();
    }

    let mut parts: Vec<String> = vec![];
    parts.push(line_text(&lines[start.r]).chars().skip(start.c).collect());

    for row in (start.r + 1)..end.r {
        parts.push(line_text(&lines[row]));
    }

    parts.push(line_text(&lines[end.r]).chars().take(end.c).collect());
    parts.join("\n")
}

fn line_text(line: &Line) -> String {
    line.chars.iter().map(|char_node| char_node.ch.clone()).collect::<Vec<String>>().join("")
}

fn delete_selection(lines: &Vec<Line>, selection: &Option<Selection>) -> (Vec<Line>, Position) {
    let Some((start, end)) = normalized_selection(selection) else {
        return (lines.clone(), selection.as_ref().map(|s| s.focus.clone()).unwrap_or(Position { r: 0, c: 0 }));
    };

    if compare_positions(&start, &end) == 0 {
        return (lines.clone(), start);
    }

    let mut next_lines = lines.clone();

    if start.r == end.r {
        if let Some(line) = next_lines.get_mut(start.r) {
            line.chars = line.chars[..start.c]
                .iter()
                .cloned()
                .chain(line.chars[end.c..].iter().cloned())
                .collect();
        }
        return (if next_lines.is_empty() { vec![] } else { next_lines }, start);
    }

    let merged = {
        let start_line = next_lines[start.r].clone();
        let end_line = next_lines[end.r].clone();
        Line {
            id: start_line.id.clone(),
            align: start_line.align.clone(),
            chars: start_line.chars[..start.c]
                .iter()
                .cloned()
                .chain(end_line.chars[end.c..].iter().cloned())
                .collect(),
        }
    };

    next_lines.splice(start.r..=end.r, vec![merged]);
    (if next_lines.is_empty() { vec![] } else { next_lines }, start)
}

fn insert_text_at_position(
    lines: &Vec<Line>,
    position: &Position,
    text: &str,
    active_formats: &ActiveFormats,
    counter: &mut usize,
) -> (Vec<Line>, Position) {
    let mut next_lines = lines.clone();
    let current_line = next_lines[position.r].clone();
    let chunks: Vec<&str> = text.split('\n').collect();
    let before = current_line.chars[..position.c].to_vec();
    let after = current_line.chars[position.c..].to_vec();

    let to_chars = |value: &str| -> Vec<CharNode> { value.chars().map(|c| create_char(c, active_formats)).collect() };

    if chunks.len() == 1 {
        if let Some(line) = next_lines.get_mut(position.r) {
            line.chars = before.into_iter().chain(to_chars(text)).chain(after.into_iter()).collect();
        }
        return (
            next_lines,
            Position {
                r: position.r,
                c: position.c + text.chars().count(),
            },
        );
    }

    let mut replacement: Vec<Line> = vec![];
    for (index, chunk) in chunks.iter().enumerate() {
        if index == 0 {
            replacement.push(Line {
                id: current_line.id.clone(),
                align: current_line.align.clone(),
                chars: before.clone().into_iter().chain(to_chars(chunk)).collect(),
            });
        } else if index == chunks.len() - 1 {
            replacement.push(Line {
                id: {
                    *counter += 1;
                    format!("line-{}", counter)
                },
                align: current_line.align.clone(),
                chars: to_chars(chunk).into_iter().chain(after.clone().into_iter()).collect(),
            });
        } else {
            replacement.push(create_line(chunk, &current_line.align, active_formats, counter));
        }
    }

    next_lines.splice(position.r..=position.r, replacement);
    let last_chunk = chunks.last().unwrap_or(&"");
    (
        next_lines,
        Position {
            r: position.r + chunks.len() - 1,
            c: last_chunk.chars().count(),
        },
    )
}

fn delete_char_near_cursor(lines: &Vec<Line>, cursor: &Position, backward: bool) -> (Vec<Line>, Position) {
    let mut next_lines = lines.clone();
    let r = cursor.r;
    let c = cursor.c;

    if backward {
        if c > 0 {
            next_lines[r].chars.remove(c - 1);
            return (next_lines, Position { r, c: c - 1 });
        }

        if r > 0 {
            let previous_length = next_lines[r - 1].chars.len();
            let current_chars = next_lines[r].chars.clone();
            next_lines[r - 1].chars.extend(current_chars);
            next_lines.remove(r);
            return (next_lines, Position { r: r - 1, c: previous_length });
        }

        return (lines.clone(), cursor.clone());
    }

    if c < next_lines[r].chars.len() {
        next_lines[r].chars.remove(c);
        return (next_lines, cursor.clone());
    }

    if r < next_lines.len() - 1 {
        let following = next_lines[r + 1].chars.clone();
        next_lines[r].chars.extend(following);
        next_lines.remove(r + 1);
        return (next_lines, cursor.clone());
    }

    (lines.clone(), cursor.clone())
}

fn moved_cursor(key: &str, position: &Position, lines: &Vec<Line>) -> Position {
    let mut r = position.r;
    let mut c = position.c;

    match key {
        "ArrowLeft" => {
            if c > 0 {
                c -= 1;
            } else if r > 0 {
                r -= 1;
                c = lines[r].chars.len();
            }
        }
        "ArrowRight" => {
            if c < lines[r].chars.len() {
                c += 1;
            } else if r < lines.len() - 1 {
                r += 1;
                c = 0;
            }
        }
        "ArrowUp" => {
            if r > 0 {
                r -= 1;
                c = c.min(lines[r].chars.len());
            }
        }
        "ArrowDown" => {
            if r < lines.len() - 1 {
                r += 1;
                c = c.min(lines[r].chars.len());
            }
        }
        _ => {}
    }

    Position { r, c }
}

fn apply_to_selection<F>(lines: &Vec<Line>, selection: &Option<Selection>, updater: F) -> Vec<Line>
where
    F: Fn(&CharNode) -> CharNode,
{
    let Some((start, end)) = normalized_selection(selection) else {
        return lines.clone();
    };

    let mut next_lines = lines.clone();
    for row in start.r..=end.r {
        let row_start = if row == start.r { start.c } else { 0 };
        let row_end = if row == end.r { end.c } else { next_lines[row].chars.len() };
        next_lines[row].chars = next_lines[row]
            .chars
            .iter()
            .enumerate()
            .map(|(index, char_node)| {
                if index >= row_start && index < row_end {
                    updater(char_node)
                } else {
                    char_node.clone()
                }
            })
            .collect();
    }

    next_lines
}

fn range_fully_formatted<F>(lines: &Vec<Line>, selection: &Option<Selection>, predicate: F) -> bool
where
    F: Fn(&CharNode) -> bool,
{
    let Some((start, end)) = normalized_selection(selection) else {
        return false;
    };

    let mut found = false;
    for row in start.r..=end.r {
        let row_start = if row == start.r { start.c } else { 0 };
        let row_end = if row == end.r { end.c } else { lines[row].chars.len() };
        for index in row_start..row_end {
            found = true;
            if !predicate(&lines[row].chars[index]) {
                return false;
            }
        }
    }

    found
}

fn affected_rows(selection: &Option<Selection>, cursor: &Position) -> Vec<usize> {
    if let Some((start, end)) = normalized_selection(selection) {
        (start.r..=end.r).collect()
    } else {
        vec![cursor.r]
    }
}

fn shared_alignment(lines: &Vec<Line>, selection: &Option<Selection>, cursor: &Position) -> Option<String> {
    let rows = affected_rows(selection, cursor);
    let first = lines.get(*rows.first()?).map(|l| l.align.clone())?;
    if rows.iter().all(|row| lines.get(*row).map(|line| line.align.clone()) == Some(first.clone())) {
        Some(first)
    } else {
        None
    }
}

fn apply_property_on_char(char_node: &mut CharNode, key: &str, value: &Value) {
    match key {
        "color" => {
            if let Some(v) = value.as_str() {
                char_node.color = v.to_string();
            }
        }
        "fontFamily" => {
            if let Some(v) = value.as_str() {
                char_node.font_family = v.to_string();
            }
        }
        "fontSize" => {
            if let Some(v) = value.as_u64() {
                char_node.font_size = v as u32;
            }
        }
        _ => {}
    }
}

fn apply_property_on_formats(formats: &mut ActiveFormats, key: &str, value: &Value) {
    match key {
        "color" => {
            if let Some(v) = value.as_str() {
                formats.color = v.to_string();
            }
        }
        "fontFamily" => {
            if let Some(v) = value.as_str() {
                formats.font_family = v.to_string();
            }
        }
        "fontSize" => {
            if let Some(v) = value.as_u64() {
                formats.font_size = v as u32;
            }
        }
        _ => {}
    }
}
