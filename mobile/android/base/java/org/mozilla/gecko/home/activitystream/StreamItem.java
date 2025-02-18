/* -*- Mode: Java; c-basic-offset: 4; tab-width: 20; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.gecko.home.activitystream;

import android.content.res.Resources;
import android.database.Cursor;
import android.graphics.Color;
import android.support.v4.view.ViewPager;
import android.support.v7.widget.RecyclerView;
import android.text.TextUtils;
import android.text.format.DateUtils;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import org.mozilla.gecko.R;
import org.mozilla.gecko.db.BrowserContract;
import org.mozilla.gecko.home.HomePager;
import org.mozilla.gecko.home.activitystream.topsites.CirclePageIndicator;
import org.mozilla.gecko.home.activitystream.topsites.TopSitesPagerAdapter;
import org.mozilla.gecko.icons.IconCallback;
import org.mozilla.gecko.icons.IconResponse;
import org.mozilla.gecko.icons.Icons;
import org.mozilla.gecko.util.DrawableUtil;
import org.mozilla.gecko.widget.FaviconView;

import java.util.concurrent.Future;

import static org.mozilla.gecko.activitystream.ActivityStream.extractLabel;

public abstract class StreamItem extends RecyclerView.ViewHolder {
    public StreamItem(View itemView) {
        super(itemView);
    }

    public static class TopPanel extends StreamItem {
        public static final int LAYOUT_ID = R.layout.activity_stream_main_toppanel;

        private final ViewPager topSitesPager;

        public TopPanel(View itemView, HomePager.OnUrlOpenListener onUrlOpenListener) {
            super(itemView);

            topSitesPager = (ViewPager) itemView.findViewById(R.id.topsites_pager);
            topSitesPager.setAdapter(new TopSitesPagerAdapter(itemView.getContext(), onUrlOpenListener));

            CirclePageIndicator indicator = (CirclePageIndicator) itemView.findViewById(R.id.topsites_indicator);
            indicator.setViewPager(topSitesPager);
        }

        public void bind(Cursor cursor, int tiles, int tilesWidth, int tilesHeight) {
            final TopSitesPagerAdapter adapter = (TopSitesPagerAdapter) topSitesPager.getAdapter();
            adapter.setTilesSize(tiles, tilesWidth, tilesHeight);
            adapter.swapCursor(cursor);

            final Resources resources = itemView.getResources();
            final int tilesMargin = resources.getDimensionPixelSize(R.dimen.activity_stream_base_margin);
            final int textHeight = resources.getDimensionPixelSize(R.dimen.activity_stream_top_sites_text_height);

            ViewGroup.LayoutParams layoutParams = topSitesPager.getLayoutParams();
            layoutParams.height = tilesHeight + tilesMargin + textHeight;
            topSitesPager.setLayoutParams(layoutParams);
        }
    }

    public static class HighlightItem extends StreamItem implements IconCallback {
        public static final int LAYOUT_ID = R.layout.activity_stream_card_history_item;

        final FaviconView vIconView;
        final TextView vLabel;
        final TextView vTimeSince;
        final TextView vSourceView;
        final TextView vPageView;

        private Future<IconResponse> ongoingIconLoad;
        private int tilesMargin;

        public HighlightItem(View itemView) {
            super(itemView);

            tilesMargin = itemView.getResources().getDimensionPixelSize(R.dimen.activity_stream_base_margin);

            vLabel = (TextView) itemView.findViewById(R.id.card_history_label);
            vTimeSince = (TextView) itemView.findViewById(R.id.card_history_time_since);
            vIconView = (FaviconView) itemView.findViewById(R.id.icon);
            vSourceView = (TextView) itemView.findViewById(R.id.card_history_source);
            vPageView = (TextView) itemView.findViewById(R.id.page);

            ImageView menuButton = (ImageView) itemView.findViewById(R.id.menu);

            menuButton.setImageDrawable(
                    DrawableUtil.tintDrawable(menuButton.getContext(), R.drawable.menu, Color.LTGRAY));
        }

        public void bind(Cursor cursor, int tilesWidth, int tilesHeight) {
            final long time = cursor.getLong(cursor.getColumnIndexOrThrow(BrowserContract.Highlights.DATE));
            final String ago = DateUtils.getRelativeTimeSpanString(time, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS, 0).toString();
            final String url = cursor.getString(cursor.getColumnIndexOrThrow(BrowserContract.Combined.URL));

            vLabel.setText(cursor.getString(cursor.getColumnIndexOrThrow(BrowserContract.History.TITLE)));
            vTimeSince.setText(ago);

            ViewGroup.LayoutParams layoutParams = vIconView.getLayoutParams();
            layoutParams.width = tilesWidth - tilesMargin;
            layoutParams.height = tilesHeight;
            vIconView.setLayoutParams(layoutParams);

            updateSource(cursor);
            updatePage(url);

            if (ongoingIconLoad != null) {
                ongoingIconLoad.cancel(true);
            }

            ongoingIconLoad = Icons.with(itemView.getContext())
                    .pageUrl(url)
                    .skipNetwork()
                    .build()
                    .execute(this);
        }

        private void updateSource(final Cursor cursor) {
            final boolean isBookmark = -1 != cursor.getLong(cursor.getColumnIndexOrThrow(BrowserContract.Combined.BOOKMARK_ID));
            final boolean isHistory = -1 != cursor.getLong(cursor.getColumnIndexOrThrow(BrowserContract.Combined.HISTORY_ID));

            if (isBookmark) {
                vSourceView.setText(R.string.activity_stream_highlight_label_bookmarked);
                vSourceView.setVisibility(View.VISIBLE);
            } else if (isHistory) {
                vSourceView.setText(R.string.activity_stream_highlight_label_visited);
                vSourceView.setVisibility(View.VISIBLE);
            } else {
                vSourceView.setVisibility(View.INVISIBLE);
            }

            vSourceView.setText(vSourceView.getText());
        }

        private void updatePage(String url) {
            final String label = extractLabel(url, false);

            if (!TextUtils.isEmpty(label)) {
                vPageView.setText(label);
            } else {
                vPageView.setText(url);
            }
        }

        @Override
        public void onIconResponse(IconResponse response) {
            vIconView.updateImage(response);
        }
    }
}
