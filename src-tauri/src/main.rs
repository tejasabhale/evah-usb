#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod usb_monitor;

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use usb_monitor::{start_usb_monitor_loop, UsbDeviceInfo, UsbMonitorState};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct NativeFileNode {
    pub id: String,
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size_bytes: u64,
    pub mime_type: String,
    pub updated_at: String,
    pub created_at: String,
    pub extension: Option<String>,
}

pub struct AppState {
    pub usb_monitor: Arc<Mutex<UsbMonitorState>>,
    pub base_storage_dir: Mutex<Option<PathBuf>>,
}

#[tauri::command]
fn get_current_usb_device(state: State<AppState>) -> Option<UsbDeviceInfo> {
    state.usb_monitor.lock().unwrap().current_device.clone()
}

#[tauri::command]
fn init_evah_storage(base_path: String, state: State<AppState>) -> Result<(), String> {
    let p = if base_path.is_empty() {
        if let Some(dev) = state.usb_monitor.lock().unwrap().current_device.as_ref() {
            PathBuf::from(&dev.evah_data_dir)
        } else {
            dirs_storage_fallback()
        }
    } else {
        PathBuf::from(base_path)
    };

    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    fs::create_dir_all(p.join("files")).map_err(|e| e.to_string())?;
    fs::create_dir_all(p.join("vault")).map_err(|e| e.to_string())?;
    fs::create_dir_all(p.join("wallpapers")).map_err(|e| e.to_string())?;
    fs::create_dir_all(p.join("settings")).map_err(|e| e.to_string())?;

    *state.base_storage_dir.lock().unwrap() = Some(p);
    Ok(())
}

fn resolve_path(relative_or_abs: &str, state: &State<AppState>) -> Result<PathBuf, String> {
    let base = state.base_storage_dir.lock().unwrap();
    let base_dir = match &*base {
        Some(b) => b.clone(),
        None => dirs_storage_fallback(),
    };

    let stripped = relative_or_abs
        .trim_start_matches("/EVAH/data")
        .trim_start_matches("EVAH/data")
        .trim_start_matches('/')
        .trim_start_matches('\\');

    Ok(base_dir.join(stripped))
}

fn dirs_storage_fallback() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")).join("EVAH_LOCAL_STORAGE")
}

#[tauri::command]
fn fs_read_file(path: String, state: State<AppState>) -> Result<String, String> {
    let target = resolve_path(&path, &state)?;
    fs::read_to_string(target).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_write_file(path: String, content: String, state: State<AppState>) -> Result<(), String> {
    let target = resolve_path(&path, &state)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(target, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_delete_file(path: String, state: State<AppState>) -> Result<(), String> {
    let target = resolve_path(&path, &state)?;
    fs::remove_file(target).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_create_dir(path: String, state: State<AppState>) -> Result<(), String> {
    let target = resolve_path(&path, &state)?;
    fs::create_dir_all(target).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_delete_dir(path: String, state: State<AppState>) -> Result<(), String> {
    let target = resolve_path(&path, &state)?;
    fs::remove_dir_all(target).map_err(|e| e.to_string())
}

#[tauri::command]
fn fs_exists(path: String, state: State<AppState>) -> Result<bool, String> {
    let target = resolve_path(&path, &state)?;
    Ok(target.exists())
}

#[tauri::command]
fn fs_list_dir(path: String, state: State<AppState>) -> Result<Vec<NativeFileNode>, String> {
    let target = resolve_path(&path, &state)?;
    if !target.exists() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
    let entries = fs::read_dir(target).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let filename = entry.file_name().to_string_lossy().to_string();
        let is_dir = meta.is_dir();
        let ext = if is_dir {
            None
        } else {
            filename.split('.').last().map(|s| s.to_string())
        };

        results.push(NativeFileNode {
            id: format!("node_{}", filename),
            name: filename.clone(),
            path: format!("{}/{}", path.trim_end_matches('/'), filename),
            is_directory: is_dir,
            size_bytes: meta.len(),
            mime_type: if is_dir { "inode/directory".to_string() } else { "application/octet-stream".to_string() },
            updated_at: chrono_like_now(),
            created_at: chrono_like_now(),
            extension: ext,
        });
    }

    Ok(results)
}

#[tauri::command]
fn fs_get_stats() -> serde_json::Value {
    serde_json::json!({
        "totalFiles": 128,
        "totalDirectories": 16,
        "totalSizeBytes": 45000000,
        "freeSizeBytes": 32000000000_u64
    })
}

fn chrono_like_now() -> String {
    "2026-10-07T00:00:00Z".to_string()
}

fn main() {
    let usb_monitor_state = Arc::new(Mutex::new(UsbMonitorState::new()));

    let app_state = AppState {
        usb_monitor: usb_monitor_state.clone(),
        base_storage_dir: Mutex::new(None),
    };

    tauri::Builder::default()
        .manage(app_state)
        .setup(move |app| {
            let handle = app.handle().clone();
            start_usb_monitor_loop(handle, usb_monitor_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_current_usb_device,
            init_evah_storage,
            fs_read_file,
            fs_write_file,
            fs_delete_file,
            fs_create_dir,
            fs_delete_dir,
            fs_exists,
            fs_list_dir,
            fs_get_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running EVAH native shell");
}
