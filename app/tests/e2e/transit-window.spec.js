import { test, expect } from '@playwright/test';
import { openMapPage, clickRealPointer } from './helpers.js';

test('저장 교통장소 이벤트로 지하철 정보창 열기·호선 전환·닫기', async ({ page }) => {
  // Real MapLibre UI work and metro panels are significantly slower on
  // GitHub's software-rendered Chromium; do not remove functional checks.
  test.setTimeout(240000);
  await openMapPage(page);
  await expect(page.locator('#transport-save-folder')).toBeAttached({ timeout: 60000 });

  // The application exposes this event for opening a saved bus/subway place.
  // Use a real verified Dongjak station identity and coordinates.
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('dongjak:open-saved-transport', {
      detail: {
        place: {
          kind: 'subway',
          name: '이수',
          lng: 126.981605,
          lat: 37.485196,
          lines: ['4호선', '7호선'],
          selectedLine: '7호선'
        }
      }
    }));
  });

  const panel = page.locator('#transport-sheet');
  await expect(panel).toBeVisible({ timeout: 15000 });
  await expect(panel).toHaveAttribute('data-kind', 'subway');
  await expect(page.locator('#transport-title')).toContainText('이수역', { timeout: 25000 });

  const actionRow = panel.locator('.transport-panel-head > .dj-news-transport-actions');
  const actions = actionRow.getByRole('button');
  await expect(actions).toHaveCount(4);
  const labels = ['여기서 출발', '여기로 도착', '즐겨찾기 추가', '교통 장소 공유'];
  for (const [index, label] of labels.entries()) {
    await expect(actions.nth(index)).toBeVisible();
    await expect(actions.nth(index)).toHaveAccessibleName(label);
  }
  const boxes = await actions.evaluateAll(buttons => buttons.map(button => {
    const { left, right, top, height } = button.getBoundingClientRect();
    return { left, right, centerY: top + height / 2, height };
  }));
  for (const [index, box] of boxes.entries()) {
    if (index > 0) {
      expect(box.left).toBeGreaterThanOrEqual(boxes[index - 1].right);
      expect(Math.abs(box.centerY - boxes[0].centerY)).toBeLessThanOrEqual(2);
    }
    if (page.viewportSize().width <= 699) expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const bookmark = actionRow.getByRole('button', { name: '즐겨찾기 추가' });
  const folder = panel.locator('.transport-selection-box > .transport-selection-actions + .dj824-transport-favorites > #transport-save-folder');
  await expect(folder).toBeHidden();
  await clickRealPointer(page, bookmark, 'Metro bookmark sign-in');
  const signIn = page.locator('#dj-transit-signin-prompt');
  await expect(signIn).toBeVisible();
  await clickRealPointer(page, signIn.getByRole('button', { name: '로그인 안내 닫기' }), 'Sign-in prompt close');
  await expect(signIn).toBeHidden();
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await expect(folder).toBeHidden();

  const line4 = page.getByRole('button', { name: /^4호선(?: 호선)?으로 전환$/ });
  await expect(line4).toBeVisible();
  await expect(line4).toHaveAttribute('aria-pressed', 'false');
  await clickRealPointer(page, line4, 'Metro transfer to line 4');
  await expect(panel).toBeVisible();
  await expect(page.getByRole('button', { name: /^4호선(?: 호선)?으로 전환$/ }))
    .toHaveAttribute('aria-pressed', 'true');

  await clickRealPointer(page, page.locator('#transport-close'), 'Metro panel close');
  await expect(panel).toBeHidden();
  await expect(page.locator('#app')).not.toHaveClass(/transport-sheet-open/);
});
