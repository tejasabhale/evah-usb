use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::Disks;
use tauri::{AppHandle, Emitter};

pub const EVAH_MARKER_FILE: &str = "EVAH_DEVICE";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsbDeviceInfo {
    pub id: String,
    pub name: String,
    pub mount_path: String,
    pub is_connected: bool,
    pub is_verified: bool,
    pub total_space_bytes: u64,
    pub free_space_bytes: u64,
    pub marker_found: bool,
    pub serial_number: String,
    pub vendor_name: String,
    pub product_name: String,
    pub evah_data_dir: String,
}

pub struct UsbMonitorState {
    pub current_device: Option<UsbDeviceInfo>,
}

impl UsbMonitorState {
    pub fn new() -> Self {
        Self {
            current_device: None,
        }
    }
}

pub fn scan_for_evah_device() -> Option<UsbDeviceInfo> {
    let disks = Disks::new_with_refreshed_list();
    for disk in disks.list() {
        let mount_point = disk.mount_point();
        let evah_dir = mount_point.join("EVAH");
        let marker = mount_point.join(EVAH_MARKER_FILE);
        let inner_marker = evah_dir.join(EVAH_MARKER_FILE);

        let marker_found = marker.exists() || inner_marker.exists() || evah_dir.exists();
        if marker_found {
            let data_dir = evah_dir.join("data");
            return Some(UsbDeviceInfo {
                id: format!("evah_{}", disk.name().to_string_lossy()),
                name: disk.name().to_string_lossy().to_string(),
                mount_path: mount_point.to_string_lossy().to_string(),
                is_connected: true,
                is_verified: true,
                total_space_bytes: disk.total_space(),
                free_space_bytes: disk.available_space(),
                marker_found: true,
                serial_number: "EV-HW-SEC-01".to_string(),
                vendor_name: "EVAH Portable Storage".to_string(),
                product_name: "Secure USB Vault".to_string(),
                evah_data_dir: data_dir.to_string_lossy().to_string(),
            });
        }
    }
    None
}

pub fn start_usb_monitor_loop(app_handle: AppHandle, state: Arc<Mutex<UsbMonitorState>>) {
    tokio::spawn(async move {
        let mut last_detected_path: Option<String> = None;

        loop {
            tokio::time::sleep(Duration::from_millis(1500)).await;

            let detected = scan_for_evah_device();
            let mut state_guard = state.lock().unwrap();

            match (&last_detected_path, &detected) {
                // Case 1: Device newly connected
                (None, Some(dev)) => {
                    last_detected_path = Some(dev.mount_path.clone());
                    state_guard.current_device = Some(dev.clone());

                    let _ = app_handle.emit("usb_detected", dev);
                    let _ = app_handle.emit("usb_verified", dev);
                }
                // Case 2: Device unplugged / removed
                (Some(_old_path), None) => {
                    last_detected_path = None;
                    state_guard.current_device = None;

                    let _ = app_handle.emit("usb_removed", serde_json::json!({
                        "reason": "Physical volume disconnection"
                    }));
                    let _ = app_handle.emit("session_invalidated", serde_json::json!({
                        "reason": "USB physical removal security policy"
                    }));
                }
                // Case 3: Mount path changed
                (Some(old_path), Some(dev)) if old_path != &dev.mount_path => {
                    last_detected_path = Some(dev.mount_path.clone());
                    state_guard.current_device = Some(dev.clone());
                    let _ = app_handle.emit("usb_mount_changed", dev);
                }
                _ => {}
            }
        }
    });
}
