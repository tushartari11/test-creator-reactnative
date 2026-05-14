package com.testcreator.entity;

/**
 * Types of proctoring violations that can be detected during a test attempt.
 *
 * <p>
 * The frontend JavaScript monitors for these events and reports them
 * to the backend for logging and potential action.
 *
 * @see ProctoringViolation
 */
public enum ViolationType {

    /**
     * User switched to a different browser tab.
     * Detected via visibilitychange event.
     */
    TAB_SWITCH,

    /**
     * Browser window lost focus (user clicked outside).
     * Detected via blur event on window.
     */
    WINDOW_BLUR,

    /**
     * User attempted to copy or paste content.
     * Detected via copy/paste/cut events.
     */
    COPY_PASTE,

    /**
     * User attempted right-click (context menu).
     * Detected via contextmenu event.
     */
    RIGHT_CLICK,

    /**
     * User pressed forbidden keyboard shortcuts (Ctrl+C, F12, etc.).
     * Detected via keydown event.
     */
    KEYBOARD_SHORTCUT,

    /**
     * Browser window was resized significantly.
     * May indicate screen sharing or split screen.
     */
    SCREEN_RESIZE,

    /**
     * Browser developer tools were opened.
     * Detected via various heuristics.
     */
    DEVTOOLS_OPEN,

    /**
     * Multiple monitors detected.
     * Detected via screen.width comparisons.
     */
    MULTIPLE_MONITORS,

    /**
     * Network connection lost during test.
     * Detected via navigator.onLine or heartbeat failure.
     */
    CONNECTION_LOST,

    /**
     * Heartbeat was missed (client didn't ping server).
     * Server-side detection after timeout.
     */
    HEARTBEAT_MISSED,

    /**
     * User attempted to use browser navigation (back/forward).
     * Detected via popstate or beforeunload events.
     */
    BROWSER_NAVIGATION,

    /**
     * Any other violation not covered above.
     */
    OTHER
}
