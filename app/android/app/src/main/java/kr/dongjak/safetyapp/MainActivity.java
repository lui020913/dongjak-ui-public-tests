package kr.dongjak.safetyapp;

import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.view.ViewGroup;
import android.view.View;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginCall;
import org.json.JSONArray;
import org.json.JSONObject;
import org.maplibre.android.MapLibre;
import org.maplibre.android.camera.CameraPosition;
import org.maplibre.android.geometry.LatLng;
import org.maplibre.android.maps.MapView;
import org.maplibre.android.maps.MapLibreMap;
import org.maplibre.android.maps.MapLibreMapOptions;
import org.maplibre.android.maps.Style;

public class MainActivity extends BridgeActivity {
    private MapView nativeView;
    private MapLibreMap nativeMap;
    private boolean started,resumed,visible;
    private int generation=0;
    private PluginCall pending;
    private CameraPosition latestCamera;
    private final Handler handler=new Handler(Looper.getMainLooper());
    @Override public void onCreate(Bundle state) {
        registerPlugin(NativePreviewPlugin.class);
        super.onCreate(state);
        MapLibre.getInstance(this);
    }
    void showSnapshot(PluginCall call){
        runOnUiThread(()->{
            try{
                hideNative();
                final int token=++generation;
                pending=call;
                latestCamera=readCamera(call);
                String json=call.getString("style");
                if(json==null||json.length()>35000000)throw new IllegalArgumentException("style snapshot too large");
                JSONArray images=call.getArray("images");
                WebView web=getBridge().getWebView();
                if(nativeView==null){
                    ViewGroup parent=(ViewGroup)web.getParent();
                    nativeView=new MapView(this,new MapLibreMapOptions().textureMode(true));
                    nativeView.setVisibility(View.INVISIBLE);
                    nativeView.setClickable(false);
                    nativeView.onCreate(null);
                    parent.addView(nativeView,0,new ViewGroup.LayoutParams(-1,-1));
                    if(started)nativeView.onStart();
                    if(resumed)nativeView.onResume();
                }
                nativeView.setVisibility(View.VISIBLE);
                handler.postDelayed(()->{if(generation==token&&pending==call){pending=null;hideNative();call.reject("Native style load timed out");}},20000);
                nativeView.getMapAsync(map->{
                    if(token!=generation)return;
                    nativeMap=map;
                    map.getUiSettings().setAllGesturesEnabled(false);
                    map.getUiSettings().setCompassEnabled(false);
                    map.getUiSettings().setAttributionEnabled(false);
                    map.getUiSettings().setLogoEnabled(false);
                    if(latestCamera!=null)map.setCameraPosition(latestCamera);
                    map.setStyle(new Style.Builder().fromJson(json),style->{
                        if(token!=generation||pending!=call)return;
                        try{
                            if(images!=null)for(int i=0;i<images.length();i++){
                                JSONObject image=images.getJSONObject(i);
                                byte[] bytes=Base64.decode(image.getString("png"),Base64.DEFAULT);
                                Bitmap bitmap=BitmapFactory.decodeByteArray(bytes,0,bytes.length);
                                if(bitmap!=null)style.addImage(image.getString("id"),bitmap,image.optBoolean("sdf",false));
                            }
                            if(latestCamera!=null)map.setCameraPosition(latestCamera);
                            final MapView.OnDidFinishRenderingFrameListener[] listener=new MapView.OnDidFinishRenderingFrameListener[1];
                            listener[0]=(fully,encoding,rendering)->{
                                if(token!=generation||pending!=call){if(nativeView!=null)nativeView.removeOnDidFinishRenderingFrameListener(listener[0]);return;}
                                if(!fully)return;
                                nativeView.removeOnDidFinishRenderingFrameListener(listener[0]);
                                pending=null;visible=true;web.setBackgroundColor(Color.TRANSPARENT);call.resolve();
                            };
                            nativeView.addOnDidFinishRenderingFrameListener(listener[0]);
                            nativeView.invalidate();
                        }catch(Exception error){pending=null;hideNative();call.reject("Native image synchronization failed",error);}
                    });
                });
            }catch(Exception error){pending=null;hideNative();call.reject("Native preview failed",error);}
        });
    }
    private CameraPosition readCamera(PluginCall call){
        Double lat=call.getDouble("lat"),lng=call.getDouble("lng"),zoom=call.getDouble("zoom"),pitch=call.getDouble("pitch"),bearing=call.getDouble("bearing");
        if(lat==null||lng==null||zoom==null||pitch==null||bearing==null)throw new IllegalArgumentException("camera");
        return new CameraPosition.Builder().target(new LatLng(lat,lng)).zoom(zoom).tilt(pitch).bearing(bearing).build();
    }
    void syncCamera(PluginCall call){runOnUiThread(()->{try{latestCamera=readCamera(call);if(nativeMap!=null)nativeMap.setCameraPosition(latestCamera);call.resolve();}catch(Exception error){call.reject("camera",error);}});}
    void hideNative(){
        generation++;visible=false;
        if(pending!=null){PluginCall canceled=pending;pending=null;canceled.reject("Native snapshot superseded");}
        if(nativeView!=null)nativeView.setVisibility(View.INVISIBLE);
        if(getBridge()!=null&&getBridge().getWebView()!=null)getBridge().getWebView().setBackgroundColor(Color.WHITE);
    }
    @Override public void onStart(){super.onStart();started=true;if(nativeView!=null)nativeView.onStart();}
    @Override public void onResume(){super.onResume();resumed=true;if(nativeView!=null)nativeView.onResume();}
    @Override public void onPause(){resumed=false;if(nativeView!=null)nativeView.onPause();super.onPause();}
    @Override public void onStop(){started=false;if(nativeView!=null)nativeView.onStop();super.onStop();}
    @Override public void onLowMemory(){super.onLowMemory();if(nativeView!=null)nativeView.onLowMemory();}
    @Override public void onDestroy(){handler.removeCallbacksAndMessages(null);hideNative();if(nativeView!=null)nativeView.onDestroy();nativeView=null;nativeMap=null;super.onDestroy();}
}
