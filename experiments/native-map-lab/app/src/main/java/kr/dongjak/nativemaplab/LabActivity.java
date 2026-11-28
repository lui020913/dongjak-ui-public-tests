package kr.dongjak.nativemaplab;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.ViewGroup;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import org.maplibre.android.MapLibre;
import org.maplibre.android.camera.CameraPosition;
import org.maplibre.android.camera.CameraUpdateFactory;
import org.maplibre.android.geometry.LatLng;
import org.maplibre.android.maps.MapLibreMap;
import org.maplibre.android.maps.MapView;
import org.maplibre.android.maps.Style;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;

public final class LabActivity extends AppCompatActivity {
    static final String STYLE = "https://tiles.openfreemap.org/styles/bright";
    // Identical camera itinerary in web.html. The idle period is excluded.
    static final double[][] ROUTE = {
        {37.502834,126.94791,17.8,0}, {37.5040,126.9495,17.8,0},
        {37.5040,126.9495,16.2,0}, {37.502834,126.94791,17.8,0},
        {37.502834,126.94791,17.8,45}, {37.5040,126.9495,17.8,45},
        {37.502834,126.94791,17.8,0}
    };
    final Handler handler = new Handler(Looper.getMainLooper());
    final ArrayList<Double> gaps = new ArrayList<>();
    FrameLayout host;
    TextView status;
    Button run;
    MapView nativeView;
    MapLibreMap nativeMap;
    WebView web;
    boolean started,resumed,ready,measuring,running;
    long previous;
    int generation;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        MapLibre.getInstance(this);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        LinearLayout buttons = new LinearLayout(this);
        Button nativeButton=new Button(this);nativeButton.setText("Native");
        Button webButton=new Button(this);webButton.setText("WebGL");
        run=new Button(this);run.setText("동일 경로 측정");run.setEnabled(false);
        buttons.addView(nativeButton,new LinearLayout.LayoutParams(0,-2,1));
        buttons.addView(webButton,new LinearLayout.LayoutParams(0,-2,1));
        buttons.addView(run,new LinearLayout.LayoutParams(0,-2,1));
        status=new TextView(this);status.setPadding(16,8,16,8);status.setText("실험용 · 기본지도만 비교");
        host=new FrameLayout(this);
        root.addView(buttons);root.addView(status);root.addView(host,new LinearLayout.LayoutParams(-1,0,1));
        setContentView(root);
        nativeButton.setOnClickListener(v->showNative());
        webButton.setOnClickListener(v->showWeb());
        run.setOnClickListener(v->{if(web!=null)web.evaluateJavascript("window.runLab?.()",null);else startNative();});
        showNative();
    }
    void clearEngine(){
        generation++;handler.removeCallbacksAndMessages(null);ready=false;running=false;measuring=false;run.setEnabled(false);
        if(nativeView!=null){if(resumed)nativeView.onPause();if(started)nativeView.onStop();host.removeView(nativeView);nativeView.onDestroy();nativeView=null;nativeMap=null;}
        if(web!=null){host.removeView(web);web.stopLoading();web.destroy();web=null;}
    }
    CameraPosition camera(double[] p){
        return new CameraPosition.Builder().target(new LatLng(p[0],p[1])).zoom(p[2]).tilt(p[3]).bearing(0).build();
    }
    void showNative(){
        clearEngine();int token=generation;status.setText("Native · 지도 로딩 중");
        nativeView=new MapView(this);nativeView.onCreate(null);
        host.addView(nativeView,new FrameLayout.LayoutParams(-1,-1));
        if(started)nativeView.onStart();if(resumed)nativeView.onResume();
        nativeView.addOnDidFinishRenderingFrameListener((MapView.OnDidFinishRenderingFrameListener)(fully,encoding,rendering)->{
            if(!measuring||token!=generation)return;
            long stamp=SystemClock.elapsedRealtimeNanos();
            if(previous!=0)gaps.add((stamp-previous)/1e6);
            previous=stamp;
        });
        nativeView.addOnDidFailLoadingMapListener(message->{if(token==generation){status.setText("Native 지도 로딩 실패: "+message);run.setEnabled(false);}});
        nativeView.getMapAsync(map->{if(token!=generation)return;nativeMap=map;map.setCameraPosition(camera(ROUTE[0]));
            map.setStyle(new Style.Builder().fromUri(STYLE),style->{
                if(token!=generation)return;
                ready=true;run.setEnabled(true);status.setText("Native · 타일 로딩이 끝난 후 측정하세요.");
            });
        });
    }
    void showWeb(){
        clearEngine();int token=generation;status.setText("WebGL · 지도 로딩 중 (결과는 지도 하단)");
        web=new WebView(this);web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return loader.shouldInterceptRequest(r.getUrl());}
            @Override public void onPageFinished(WebView v,String url){if(token==generation){run.setEnabled(true);status.setText("WebGL · 지도 하단 준비 표시 확인 후 측정");}}
        });
        host.addView(web,new FrameLayout.LayoutParams(-1,-1));web.loadUrl("https://appassets.androidplatform.net/assets/web.html");
    }
    void startNative(){
        if(!ready||running||nativeMap==null)return;
        running=true;run.setEnabled(false);gaps.clear();nativeMap.setCameraPosition(camera(ROUTE[0]));
        status.setText("Native · 동일 경로 준비 중");
        int token=generation;handler.postDelayed(()->step(1,token),3000);
    }
    void step(int i,int token){
        if(token!=generation||nativeMap==null||!resumed)return;
        if(i>=ROUTE.length){running=false;run.setEnabled(true);status.setText(report());return;}
        previous=0;measuring=true;
        nativeMap.animateCamera(CameraUpdateFactory.newCameraPosition(camera(ROUTE[i])),1200,new MapLibreMap.CancelableCallback(){
            public void onFinish(){next();}
            public void onCancel(){if(token==generation){measuring=false;running=false;run.setEnabled(ready);status.setText("Native · 측정 취소");}}
            void next(){if(token!=generation)return;measuring=false;handler.postDelayed(()->step(i+1,token),350);}
        });
    }
    String report(){
        if(gaps.size()<2)return "Native · 샘플 부족";
        Collections.sort(gaps);double total=0;int slow=0;for(double ms:gaps){total+=ms;if(ms>33.33)slow++;}
        double median=gaps.get((gaps.size()-1)/2),p95=gaps.get((int)Math.ceil(gaps.size()*.95)-1);
        return String.format(Locale.US,"Native · n=%d / p50 %.1fms / p95 %.1fms / >33ms %.1f%% / 평균 %.1f FPS (렌더 콜백)",gaps.size(),median,p95,100.0*slow/gaps.size(),1000*gaps.size()/total);
    }
    @Override protected void onStart(){super.onStart();started=true;if(nativeView!=null)nativeView.onStart();}
    @Override protected void onResume(){super.onResume();resumed=true;if(nativeView!=null)nativeView.onResume();if(web!=null)web.onResume();}
    @Override protected void onPause(){measuring=false;running=false;handler.removeCallbacksAndMessages(null);if(nativeMap!=null)nativeMap.cancelTransitions();if(nativeView!=null)nativeView.onPause();if(web!=null)web.onPause();run.setEnabled(ready||web!=null);resumed=false;super.onPause();}
    @Override protected void onStop(){if(nativeView!=null)nativeView.onStop();started=false;super.onStop();}
    @Override public void onLowMemory(){super.onLowMemory();if(nativeView!=null)nativeView.onLowMemory();}
    @Override protected void onDestroy(){clearEngine();super.onDestroy();}
}
