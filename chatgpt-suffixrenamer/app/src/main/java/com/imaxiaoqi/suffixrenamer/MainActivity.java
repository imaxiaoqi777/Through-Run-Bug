package com.imaxiaoqi.suffixrenamer;

import android.Manifest;
import android.app.*;
import android.os.*;
import android.provider.Settings;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Environment;
import android.view.*;
import android.widget.*;
import java.io.File;
import java.util.*;

public class MainActivity extends Activity {
    private File currentDir;
    private final ArrayList<File> visible = new ArrayList<>();
    private final LinkedHashSet<String> selected = new LinkedHashSet<>();
    private final ArrayList<RenamePair> undoPairs = new ArrayList<>();
    private LinearLayout rows;
    private TextView pathText, statusText;
    private Button renameBtn, undoBtn, selectAllBtn;

    static class RenamePair {
        final String oldPath, newPath;
        RenamePair(String oldPath, String newPath) { this.oldPath = oldPath; this.newPath = newPath; }
    }
    static class Plan {
        final File from, to;
        Plan(File from, File to) { this.from = from; this.to = to; }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        buildUi();
        currentDir = Environment.getExternalStorageDirectory();
        ensurePermission();
        refresh();
    }

    private void buildUi() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(14), dp(14), dp(14), dp(10));
        root.setBackgroundColor(Color.rgb(247,248,250));

        TextView title = new TextView(this);
        title.setText("后缀批量修改"); title.setTextSize(24); title.setTextColor(Color.rgb(25,28,35));
        title.setTypeface(null, 1); root.addView(title);

        TextView sub = new TextView(this);
        sub.setText("只改后缀 · 原地保存 · 支持递归子目录"); sub.setTextSize(13); sub.setTextColor(Color.GRAY);
        sub.setPadding(0, dp(3), 0, dp(10)); root.addView(sub);

        LinearLayout topBar = new LinearLayout(this); topBar.setOrientation(LinearLayout.HORIZONTAL);
        Button back = button("← 上一级"); back.setOnClickListener(v -> goUp()); topBar.addView(back, new LinearLayout.LayoutParams(0, dp(44), 1));
        Button permission = button("文件权限"); permission.setOnClickListener(v -> openPermission());
        LinearLayout.LayoutParams pp = new LinearLayout.LayoutParams(0, dp(44), 1); pp.setMargins(dp(8),0,0,0); topBar.addView(permission, pp);
        root.addView(topBar);

        pathText = new TextView(this); pathText.setTextSize(12); pathText.setTextColor(Color.DKGRAY); pathText.setPadding(0,dp(10),0,dp(8)); root.addView(pathText);

        ScrollView scroll = new ScrollView(this); rows = new LinearLayout(this); rows.setOrientation(LinearLayout.VERTICAL); scroll.addView(rows);
        root.addView(scroll, new LinearLayout.LayoutParams(-1,0,1));

        statusText = new TextView(this); statusText.setTextSize(13); statusText.setTextColor(Color.DKGRAY); statusText.setPadding(0,dp(8),0,dp(6)); root.addView(statusText);

        LinearLayout actions = new LinearLayout(this); actions.setOrientation(LinearLayout.HORIZONTAL);
        selectAllBtn = button("全选当前"); selectAllBtn.setOnClickListener(v -> toggleSelectAll()); actions.addView(selectAllBtn, new LinearLayout.LayoutParams(0,dp(48),1));
        renameBtn = button("修改后缀"); renameBtn.setEnabled(false); renameBtn.setOnClickListener(v -> showRenameDialog());
        LinearLayout.LayoutParams rp = new LinearLayout.LayoutParams(0,dp(48),1.2f); rp.setMargins(dp(8),0,0,0); actions.addView(renameBtn,rp);
        undoBtn = button("撤销"); undoBtn.setEnabled(false); undoBtn.setOnClickListener(v -> undoLast());
        LinearLayout.LayoutParams up = new LinearLayout.LayoutParams(0,dp(48),.8f); up.setMargins(dp(8),0,0,0); actions.addView(undoBtn,up);
        root.addView(actions);
        setContentView(root);
    }

    private Button button(String text) {
        Button b = new Button(this); b.setText(text); b.setTextSize(14); b.setAllCaps(false); return b;
    }

    private void ensurePermission() {
        if (Build.VERSION.SDK_INT >= 30) {
            if (!Environment.isExternalStorageManager()) openPermission();
        } else if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE}, 7);
        }
    }

    private void openPermission() {
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                Intent i = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:" + getPackageName()));
                startActivity(i);
            } else {
                requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE}, 7);
            }
        } catch (Exception e) {
            if (Build.VERSION.SDK_INT >= 30) startActivity(new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION));
        }
    }

    private boolean protectedFile(File f) {
        String p = f.getAbsolutePath().replace('\\','/');
        String root = Environment.getExternalStorageDirectory().getAbsolutePath().replace('\\','/');
        return p.equals(root + "/Android") || p.startsWith(root + "/Android/");
    }

    private boolean displayable(File f) { return !f.getName().startsWith(".") && !protectedFile(f); }

    private void refresh() {
        visible.clear(); rows.removeAllViews();
        pathText.setText(currentDir == null ? "" : currentDir.getAbsolutePath());
        File[] list = currentDir == null ? null : currentDir.listFiles();
        if (list != null) {
            Arrays.sort(list, (a,b) -> {
                if (a.isDirectory() != b.isDirectory()) return a.isDirectory() ? -1 : 1;
                return a.getName().compareToIgnoreCase(b.getName());
            });
            for (File f : list) if (displayable(f)) { visible.add(f); addRow(f); }
        }
        updateStatus();
    }

    private void addRow(File f) {
        TextView tv = new TextView(this);
        tv.setText((f.isDirectory() ? "📁  " : "📄  ") + f.getName());
        tv.setTextSize(16); tv.setTextColor(Color.rgb(35,38,45)); tv.setGravity(Gravity.CENTER_VERTICAL);
        tv.setPadding(dp(12),0,dp(8),0); tv.setBackgroundColor(selected.contains(f.getAbsolutePath()) ? Color.rgb(220,235,255) : Color.WHITE);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1,dp(52)); lp.setMargins(0,0,0,dp(5)); rows.addView(tv,lp);
        tv.setOnClickListener(v -> {
            if (!selected.isEmpty()) toggleSelection(f); else if (f.isDirectory()) { currentDir=f; refresh(); } else toggleSelection(f);
        });
        tv.setOnLongClickListener(v -> { toggleSelection(f); return true; });
    }

    private void toggleSelection(File f) {
        String p=f.getAbsolutePath(); if (selected.contains(p)) selected.remove(p); else selected.add(p); refresh();
    }

    private void toggleSelectAll() {
        boolean all=true; for(File f:visible) if(!selected.contains(f.getAbsolutePath())) { all=false; break; }
        if(all) for(File f:visible) selected.remove(f.getAbsolutePath()); else for(File f:visible) selected.add(f.getAbsolutePath());
        refresh();
    }

    private void updateStatus() {
        statusText.setText("已选择 " + selected.size() + " 项" + (undoPairs.isEmpty() ? "" : "  ·  可撤销 " + undoPairs.size() + " 个改名"));
        renameBtn.setEnabled(!selected.isEmpty()); undoBtn.setEnabled(!undoPairs.isEmpty());
    }

    private void goUp() {
        if(!selected.isEmpty()) { selected.clear(); refresh(); return; }
        File root=Environment.getExternalStorageDirectory(); if(currentDir!=null && !currentDir.equals(root) && currentDir.getParentFile()!=null) { currentDir=currentDir.getParentFile(); refresh(); }
    }

    @Override public void onBackPressed() { if(!selected.isEmpty()) { selected.clear(); refresh(); } else { File root=Environment.getExternalStorageDirectory(); if(currentDir!=null && !currentDir.equals(root)) goUp(); else super.onBackPressed(); } }

    private String suffix(String raw) {
        if(raw==null) return ""; raw=raw.trim(); if(raw.isEmpty()) return ""; return raw.startsWith(".") ? raw : "."+raw;
    }

    private void showRenameDialog() {
        LinearLayout box=new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(dp(22),dp(8),dp(22),0);
        EditText oldE=new EditText(this); oldE.setHint("原后缀，例如 mp4"); box.addView(oldE);
        EditText newE=new EditText(this); newE.setHint("新后缀，例如 txt"); box.addView(newE);
        TextView note=new TextView(this); note.setText("已选文件夹会递归处理子文件夹；隐藏文件与 Android 系统目录不会处理。"); note.setTextSize(12); note.setTextColor(Color.GRAY); note.setPadding(0,dp(8),0,0); box.addView(note);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("修改文件后缀").setView(box).setNegativeButton("取消",null).setPositiveButton("扫描",null).create();
        d.setOnShowListener(x -> d.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String oldS=suffix(oldE.getText().toString()), newS=suffix(newE.getText().toString());
            if(oldS.isEmpty() || newS.isEmpty()) { Toast.makeText(this,"请填写原后缀和新后缀",Toast.LENGTH_SHORT).show(); return; }
            if(oldS.equalsIgnoreCase(newS)) { Toast.makeText(this,"新旧后缀相同",Toast.LENGTH_SHORT).show(); return; }
            d.dismiss(); prepare(oldS,newS);
        })); d.show();
    }

    private void collect(File f, String oldS, ArrayList<File> out) {
        if(f==null || protectedFile(f) || f.getName().startsWith(".")) return;
        if(f.isFile()) { if(f.getName().toLowerCase(Locale.ROOT).endsWith(oldS.toLowerCase(Locale.ROOT))) out.add(f); return; }
        File[] cs=f.listFiles(); if(cs!=null) for(File c:cs) collect(c,oldS,out);
    }

    private void prepare(String oldS,String newS) {
        ArrayList<File> matches=new ArrayList<>(); for(String p:selected) collect(new File(p),oldS,matches);
        if(matches.isEmpty()) { new AlertDialog.Builder(this).setMessage("没有找到后缀为 " + oldS + " 的文件。 ").setPositiveButton("知道了",null).show(); return; }
        ArrayList<Plan> plans=new ArrayList<>(); int conflicts=0;
        for(File f:matches) {
            String name=f.getName(); String nn=name.substring(0,name.length()-oldS.length())+newS; File to=new File(f.getParentFile(),nn);
            if(to.exists() && !to.equals(f)) conflicts++; plans.add(new Plan(f,to));
        }
        final int c=conflicts;
        String msg="将修改 " + plans.size() + " 个文件\n" + oldS + "  →  " + newS + (c>0 ? "\n\n发现 " + c + " 个重名冲突。" : "");
        if(c==0) new AlertDialog.Builder(this).setTitle("确认修改").setMessage(msg).setNegativeButton("取消",null).setPositiveButton("开始",(a,b)->execute(plans,false)).show();
        else new AlertDialog.Builder(this).setTitle("存在重名文件").setMessage(msg + "\n\n选择“覆盖”会删除原同名文件，该被覆盖文件无法撤销；本次改名本身仍可撤销。")
            .setNegativeButton("取消",null).setNeutralButton("跳过冲突",(a,b)->execute(plans,false)).setPositiveButton("覆盖",(a,b)->execute(plans,true)).show();
    }

    private void execute(ArrayList<Plan> plans, boolean overwrite) {
        undoPairs.clear(); int ok=0,skip=0,fail=0;
        for(Plan p:plans) {
            if(protectedFile(p.from)) { skip++; continue; }
            if(p.to.exists()) {
                if(!overwrite) { skip++; continue; }
                if(!p.to.delete()) { fail++; continue; }
            }
            if(p.from.renameTo(p.to)) { undoPairs.add(new RenamePair(p.from.getAbsolutePath(),p.to.getAbsolutePath())); ok++; } else fail++;
        }
        selected.clear(); refresh();
        new AlertDialog.Builder(this).setTitle("处理完成").setMessage("成功 " + ok + " 个\n跳过 " + skip + " 个\n失败 " + fail + " 个" + (ok>0 ? "\n\n本次打开期间可以点击底部“撤销”。" : "")).setPositiveButton("完成",null).show();
    }

    private void undoLast() {
        if(undoPairs.isEmpty()) return;
        int ok=0,fail=0;
        for(int i=undoPairs.size()-1;i>=0;i--) {
            RenamePair p=undoPairs.get(i); File from=new File(p.newPath), to=new File(p.oldPath);
            if(from.exists() && !to.exists() && from.renameTo(to)) ok++; else fail++;
        }
        undoPairs.clear(); selected.clear(); refresh();
        new AlertDialog.Builder(this).setTitle("撤销完成").setMessage("恢复 " + ok + " 个，失败 " + fail + " 个。").setPositiveButton("完成",null).show();
    }

    private int dp(int v) { return (int)(v*getResources().getDisplayMetrics().density+0.5f); }
}
