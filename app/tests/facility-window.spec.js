await page.locator('#bottom-nav .nav-tab[data-tab="mine"]').click();

await expect(page.locator('#app')).toHaveAttribute('data-tab', 'mine');

// 내 정보에서 즐겨찾기·내 기록 화면 진입
const activityButton = page.getByRole('button', {
  name: /즐겨찾기.*내 기록/
});

await expect(activityButton).toBeVisible();
await activityButton.click();

const record = page.locator('#my-points .record-item')
  .filter({ hasText: TEST_POINT.title });

await expect(record).toBeVisible({ timeout: 15000 });