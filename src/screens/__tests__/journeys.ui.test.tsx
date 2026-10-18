import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../../../App';
import { createItem } from '../../domain/items/service';

// Each test renders the whole app (signed in, on the in-memory backend from
// jest.ui.setup.js). Items persist across tests in this file, so each test
// uses its own item name.

async function openAdd() {
  // Empty state shows "Add something"; the list header shows ＋
  const add = await screen.findByTestId(/^(empty-add-button|main-add-button)$/);
  fireEvent.press(add);
  return screen.findByTestId('add-name-input');
}

async function addItem(name: string, repeat?: { value: string; unit: string }) {
  fireEvent.changeText(await openAdd(), name);
  if (repeat) {
    fireEvent.changeText(screen.getByTestId('add-repeat-input'), repeat.value);
    fireEvent.press(screen.getByTestId(`add-unit-${repeat.unit}`));
  }
  fireEvent.press(screen.getByTestId('add-save-button'));
  return screen.findByTestId(`item-${name}`);
}

it('adds an item with a name only (no repeat) and shows it on the list', async () => {
  render(<App />);
  await addItem('Haircut');
  expect(screen.getByText('Haircut')).toBeTruthy();
  expect(screen.getAllByText('No repeat set').length).toBeGreaterThan(0);
});

it('adds an item with a repeat cycle', async () => {
  render(<App />);
  await addItem('Water plants', { value: '2', unit: 'weeks' });
  expect(await screen.findByText(/Due in 14 days/)).toBeTruthy();
});

it('shows the required-name hint when Save is tapped with no name', async () => {
  render(<App />);
  await openAdd();
  expect(screen.queryByTestId('add-save-hint')).toBeNull();

  fireEvent.press(screen.getByTestId('add-save-button'));
  expect(await screen.findByText('Add a name to save')).toBeTruthy();

  fireEvent.changeText(screen.getByTestId('add-name-input'), 'Dentist');
  expect(screen.queryByTestId('add-save-hint')).toBeNull();
});

it('marks done from the list, then Undo puts it back', async () => {
  render(<App />);
  await addItem('Car service');

  fireEvent.press(screen.getByTestId('item-Car service-done'));
  expect(await screen.findByText('Car service marked as done')).toBeTruthy();
  fireEvent.press(screen.getByTestId('toast-action'));
  await waitFor(() => expect(screen.queryByTestId('toast')).toBeNull());

  // Only the creation entry is left, so History offers no Undo
  fireEvent.press(screen.getByText('Car service'));
  expect(await screen.findByTestId('detail-mark-done-button')).toBeTruthy();
  expect(screen.queryByTestId('detail-undo-latest')).toBeNull();
});

it('marks done on Detail, then Undo from the toast', async () => {
  // Detail only offers "Mark as done today" if it wasn't already done today
  await createItem({
    name: 'Smoke alarm',
    category: 'Household',
    lastDoneDate: '2026-01-01',
    repeatValue: null,
    repeatUnit: null,
  });
  render(<App />);
  fireEvent.press(await screen.findByText('Smoke alarm'));

  fireEvent.press(await screen.findByTestId('detail-mark-done-button'));
  expect(await screen.findByTestId('detail-undo-latest')).toBeTruthy();

  fireEvent.press(screen.getByTestId('toast-action'));
  await waitFor(() => expect(screen.queryByTestId('detail-undo-latest')).toBeNull());
});

it('edits an item name', async () => {
  render(<App />);
  await addItem('Gutters');

  fireEvent.press(screen.getByTestId('item-Gutters-edit'));
  const nameInput = await screen.findByTestId('edit-name-input');
  await waitFor(() => expect(nameInput.props.value).toBe('Gutters'));
  fireEvent.changeText(nameInput, 'Clean gutters');
  fireEvent.press(screen.getByTestId('edit-save-button'));

  expect(await screen.findByTestId('item-Clean gutters')).toBeTruthy();
  expect(screen.queryByTestId('item-Gutters')).toBeNull();
});

it('shows the required-name hint on Edit when the name is cleared', async () => {
  render(<App />);
  await addItem('Filter');

  fireEvent.press(screen.getByTestId('item-Filter-edit'));
  const nameInput = await screen.findByTestId('edit-name-input');
  await waitFor(() => expect(nameInput.props.value).toBe('Filter'));
  fireEvent.changeText(nameInput, '');
  fireEvent.press(screen.getByTestId('edit-save-button'));
  expect(await screen.findByTestId('edit-save-hint')).toBeTruthy();
});

it('deletes an item, then Undo brings it back', async () => {
  render(<App />);
  await addItem('Passport');

  fireEvent.press(screen.getByTestId('item-Passport-edit'));
  fireEvent.press(await screen.findByTestId('edit-delete-button'));

  expect(await screen.findByText('Passport deleted')).toBeTruthy();
  await waitFor(() => expect(screen.queryByTestId('item-Passport')).toBeNull());

  fireEvent.press(screen.getByTestId('toast-action'));
  expect(await screen.findByTestId('item-Passport')).toBeTruthy();
});
