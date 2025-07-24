# Dropdown Selection Fix Plan - Category & Priority Menus

## Problem Analysis
The category and priority dropdown menus in the support ticket creation modal are not working properly. User can create tickets successfully, but cannot select category or priority values.

## Root Cause Analysis

### Issue: Z-Index and Portal Conflicts
The custom modal (fixed positioning with z-index: 50) is likely interfering with Radix UI Select components' dropdown portals. The SelectContent elements may be:

1. **Rendering behind the modal overlay** (z-index conflict)
2. **Not positioning correctly** due to fixed parent container
3. **Portal rendering issues** with the custom modal structure

### Current Implementation Issues:
```tsx
// Current problematic structure:
<div className="fixed inset-0 z-50 bg-black/50">  // Modal overlay
  <div className="bg-white rounded-lg">           // Modal content
    <Select>                                      // Select component
      <SelectContent>                             // This renders in portal
        <SelectItem value="technical">            // Items not clickable
```

## Fix Strategy

### Option 1: Fix Z-Index and Portal Issues (Recommended)
- Increase modal z-index to ensure SelectContent renders above
- Add proper portal configuration for Select components
- Ensure SelectContent has higher z-index than modal

### Option 2: Replace with Native HTML Select (Fallback)
- Replace Radix Select with native HTML select elements
- Simpler implementation, guaranteed to work in modal
- Less styling control but functional

### Option 3: Revert to Radix Dialog (If needed)
- Go back to Radix Dialog if custom modal causes too many issues
- Fix the original accessibility focus conflict differently

## Implementation Plan

### Step 1: Increase Z-Index Values
```tsx
// Modal with higher z-index
<div className="fixed inset-0 z-[100] bg-black/50">
  // Content with even higher z-index for dropdowns
  <style>
    [data-radix-select-content] {
      z-index: 150 !important;
    }
  </style>
```

### Step 2: Test Dropdown Functionality
- Verify category dropdown opens and selections work
- Verify priority dropdown opens and selections work
- Test form submission with selected values

### Step 3: Add Console Logging
- Log dropdown open/close events
- Log value changes for debugging
- Verify state updates are working

### Step 4: Fallback Implementation (if needed)
```tsx
// Replace problematic Radix Select with native select
<select 
  value={newTicket.category}
  onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
  className="w-full p-2 border rounded"
>
  <option value="technical">Technical Issue</option>
  <option value="billing">Billing</option>
  <option value="general">General Question</option>
</select>
```

## Expected Results
After fixing:
1. Category dropdown opens when clicked
2. Category options are selectable
3. Priority dropdown opens when clicked  
4. Priority options are selectable
5. Selected values appear in form
6. Ticket creation includes correct category/priority values

## Files to Modify
- `client/src/pages/support.tsx` - Fix Select component z-index issues
- Test the complete form functionality
- Update documentation if needed

## Testing Checklist
- [ ] Category dropdown opens
- [ ] Category options are clickable
- [ ] Selected category value shows in trigger
- [ ] Priority dropdown opens  
- [ ] Priority options are clickable
- [ ] Selected priority value shows in trigger
- [ ] Form submission includes selected values
- [ ] No console errors related to dropdowns